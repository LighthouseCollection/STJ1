#!/usr/bin/env python3
"""Required CI checks of plan section 9 for this project (gate G0). Standard library plus PyYAML.

  checks.py design    9.1 checks 1, 3 (colors and physical left/right in the site's own code) and 9 (locked choice)
  checks.py process   9.2 checks 11, 12, 13, 14 (registry, settings in prose, decisions, instruction drift) and lessons A-02/A-03 (workflows)

Every function takes the repository root and returns a list of problems (empty means PASS), so a test can feed it a
deliberate fault (lesson A-27: a gate that cannot fail is not a gate). The command exits 1 on any problem and also
when it checked nothing (fail closed). Checks that need a feature the project does not have are recorded N/A in
docs/ci-checks.md, not run.
"""
import json, os, re, sys
import yaml

def read(root, rel):
    with open(os.path.join(root, rel), encoding='utf-8') as f: return f.read()

def files(root, top, exts):
    out = []
    for d, _, names in os.walk(os.path.join(root, top)):
        if os.sep + 'assets' in d or 'node_modules' in d: continue   # generated or binary-like assets are not own code
        for n in names:
            if n.endswith(exts): out.append(os.path.relpath(os.path.join(d, n), root))
    return sorted(out)

# ---- 9.1 -------------------------------------------------------------------------------------------------------
COLOR = re.compile(r"[:'\"=(]\s*#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla)\(|\b(?:color|background|backgroundColor|background-color|fill|stroke|border-color)\s*:\s*(?:maroon|red|blue|green|black|white|gray|grey|orange|purple|navy|teal|olive|silver|yellow|lime|aqua|fuchsia)\b")
PHYSICAL = re.compile(r"\b(?:margin|padding|border)(?:Left|Right)\b|\b(?:margin|padding|border)-(?:left|right)\b|(?:text-align|float|clear)\s*:\s*['\"]?(?:left|right)\b|\btextAlign\s*:\s*['\"](?:left|right)['\"]|\b(?:left|right)\s*:\s*['\"]?-?\d")

def load_baseline(root):
    p = os.path.join(root, 'ci', 'design-baseline.json')
    return json.load(open(p, encoding='utf-8')) if os.path.exists(p) else {}

def design_scan(root):
    """Checks 1 and 3. Findings listed in ci/design-baseline.json (by file and text) are known; anything else fails."""
    base = load_baseline(root); problems = []; seen = 0
    for rel in files(root, 'site', ('.jsx', '.js', '.html')):
        seen += 1
        for n, line in enumerate(read(root, rel).splitlines(), 1):
            if line.strip().startswith(('//', '*', '<!--')) and not COLOR.search(line.split('//')[0]) and 'style' not in line: continue
            for rule, rx in (('1 color', COLOR), ('3 physical direction', PHYSICAL)):
                m = rx.search(line)
                if m and m.group(0) not in base.get(rel, []):
                    problems.append(f'check {rule}: {rel}:{n}: "{m.group(0)}" (allowed only from Plenix tokens / logical properties)')
    if seen == 0: problems.append('design scan found no site files to check (fail closed)')
    return problems

def locked_choice(root):
    """Check 9: the design system named in the project equals D-0002; the pinned version is the same everywhere."""
    d = yaml.safe_load(read(root, 'decisions/D-0002.yaml')); problems = []
    m = re.search(r'Plenix.*?version (\d+\.\d+\.\d+)', d.get('decision', ''))
    if not m or d.get('status') != 'active': return ['check 9: D-0002 is missing, not active, or names no Plenix version']
    v = m.group(1)
    pinned = json.loads(read(root, 'package.json')).get('plenix')
    if pinned != v: problems.append(f'check 9: package.json plenix is {pinned}, D-0002 locks {v}')
    for rel in ('.agents/RULES.md', 'CLAUDE.md'):
        mm = re.search(r'Plenix, published specification \S+, version (\d+\.\d+\.\d+)', read(root, rel))
        if not mm or mm.group(1) != v: problems.append(f'check 9: {rel} does not name Plenix {v}')
    return problems

def design(root): return design_scan(root) + locked_choice(root)

# ---- 9.2 -------------------------------------------------------------------------------------------------------
def registry(root):
    """Check 11: the registry parses; every role has title, kind, runtime, tier, label, definition (file exists)."""
    cfg = yaml.safe_load(read(root, 'agents.config.yaml')); problems = []
    roles = cfg.get('roles') or []
    if not roles: return ['check 11: the registry lists no roles']
    if not any(r.get('kind') == 'coordinator' for r in roles): problems.append('check 11: no PM (coordinator) role')
    rts = cfg.get('runtimes') or {}
    for r in roles:
        for k in ('id', 'title', 'kind', 'runtime', 'tier', 'label', 'definition'):
            if not r.get(k): problems.append(f'check 11: role {r.get("id")} has no {k}')
        if r.get('runtime') not in rts: problems.append(f'check 11: role {r.get("id")} names an undefined runtime')
        if r.get('definition') and not os.path.exists(os.path.join(root, r['definition'])):
            problems.append(f'check 11: role {r["id"]}: {r["definition"]} does not exist')
        if r.get('source') not in ('plan', None) and not r.get('provenance'): problems.append(f'check 11: adopted role {r["id"]} has no provenance')
    return problems

SETTING_IN_PROSE = re.compile(r"\b\d+\s+(?:slots?|reserved gate slots?)\b|\b(?:slots|ready_min|reserved_gate_slots|idle_exit_min|memory_gb)\b[`'\"]?\s*[:=]?\s*`?\d")
PROSE_EXEMPT = {'docs/PROJECT_PLAN.md', 'docs/lessons.md'}   # the plan describes the settings; lessons are history

def settings_in_prose(root):
    """Check 12: no document states a value of a registry setting (the registry is the only place)."""
    problems = []
    docs = [f for f in files(root, 'docs', ('.md',)) + files(root, '.agents', ('.md',)) + ['README.md'] if f not in PROSE_EXEMPT and f != '.agents/RULES.md']
    for rel in docs:
        for n, line in enumerate(read(root, rel).splitlines(), 1):
            m = SETTING_IN_PROSE.search(line)
            if m: problems.append(f'check 12: {rel}:{n}: states a registry setting ("{m.group(0)}"); name the setting, do not repeat its value')
    return problems

def decisions(root):
    """Check 13: unique numbers, id matches file, a check (or an explicit review-only reason), design decisions link a spec section."""
    d = os.path.join(root, 'decisions'); ids = {}; problems = []
    names = sorted(n for n in os.listdir(d) if re.fullmatch(r'D-\d{4}\.yaml', n))
    if not names: return ['check 13: no decisions found (fail closed)']
    for n in names:
        y = yaml.safe_load(read(root, f'decisions/{n}'))
        did = y.get('id')
        if did != n[:-5]: problems.append(f'check 13: {n}: id is {did}')
        if did in ids: problems.append(f'check 13: duplicate decision number {did}')
        ids[did] = 1
        for k in ('date', 'area', 'decided_by', 'decision', 'why', 'status'):
            if not y.get(k): problems.append(f'check 13: {n}: no {k}')
        c = str(y.get('check') or '').strip()
        if not c: problems.append(f'check 13: {n}: no check; write the check or "review only: <reason>"')
        elif c.lower().startswith('review only') and len(c) < len('review only: x') + 1: problems.append(f'check 13: {n}: "review only" needs a reason')
        if y.get('area') == 'design' and not y.get('spec_section'): problems.append(f'check 13: {n}: design decision without a spec_section')
    return problems

def instruction_drift(root):
    """Check 14: each runtime's instruction file equals .agents/RULES.md after its one-line generated header."""
    cfg = yaml.safe_load(read(root, 'agents.config.yaml')); rules = read(root, '.agents/RULES.md').strip(); problems = []
    ifiles = sorted({rt.get('instructions') for rt in (cfg.get('runtimes') or {}).values() if rt.get('instructions')})
    if not ifiles: return ['check 14: the registry names no instruction file (fail closed)']
    for rel in ifiles:
        text = read(root, rel); lines = text.split('\n', 1)
        body = lines[1] if lines[0].startswith('<!-- Generated') and len(lines) > 1 else text
        if body.strip() != rules: problems.append(f'check 14: {rel} differs from .agents/RULES.md')
    return problems

def workflows(root):
    """Lessons A-02 and A-03: no workflow cancels runs in progress; every workflow runs steps under bash with pipefail."""
    problems = []; names = files(root, '.github/workflows', ('.yml', '.yaml'))
    if not names: return ['no workflows found (fail closed)']
    for rel in names:
        text = read(root, rel); y = yaml.safe_load(text)
        if re.search(r'cancel-in-progress\s*:\s*(?!false\b)\S', text): problems.append(f'A-02: {rel} sets cancel-in-progress (a required check must never be cancelled)')
        if ((y.get('defaults') or {}).get('run') or {}).get('shell') != 'bash': problems.append(f'A-03: {rel} must set defaults.run.shell: bash (that shell runs with pipefail)')
        for job, spec in (y.get('jobs') or {}).items():
            if ((spec.get('defaults') or {}).get('run') or {}).get('shell', 'bash') != 'bash': problems.append(f'A-03: {rel} job {job} overrides the shell (must stay bash)')
            for i, step in enumerate(spec.get('steps') or []):
                if step.get('shell', 'bash') != 'bash': problems.append(f'A-03: {rel} job {job} step {i + 1} sets shell: {step["shell"]} (must be bash, which runs with pipefail)')
    return problems

def process(root): return registry(root) + settings_in_prose(root) + decisions(root) + instruction_drift(root) + workflows(root)

if __name__ == '__main__':
    which = sys.argv[1] if len(sys.argv) > 1 else ''
    fn = {'design': design, 'process': process}.get(which)
    if fn is None: sys.exit('usage: checks.py design|process')
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    problems = fn(root)
    for p in problems: print('FAIL', p)
    print(f'{which}: {"FAIL" if problems else "PASS"} ({len(problems)} problem(s))')
    sys.exit(1 if problems else 0)
