#!/usr/bin/env python3
"""Gate check (plan 9.2 check 15): passes only when every applicable PR review gate has recorded PASS, or N/A with a
reason, on the PR's CURRENT head, and the linked issue records G1-G4 as PASS or N/A. Fail closed: anything missing,
unreadable or ambiguous is a FAIL (lesson A-27). Needs GH_TOKEN, REPO and PR_NUMBER in the environment.

A verdict is a PR review (or PR comment) whose first line names the gate, e.g.
  **QA gate: PASS** at head `<sha>` ...      **Code Reviewer gate G5a: PASS** at head `<sha>` ...
The gates come from agents.config.yaml: every role whose `gate` starts with G5, whatever its `applies` value, so no gate is skipped
silently: each needs PASS, or N/A with a reason, on the current head. Verdict authors are not checked (all agents share
one GitHub identity); the latest record per gate wins, ordered by time across reviews and PR comments.
"""
import json, os, re, subprocess, sys
import yaml

VERDICT = re.compile(r'\b(PASS|FAIL|N/A)\b')

def gates(cfg):
    return [{'id': r['gate'], 'title': r['title']} for r in cfg.get('roles', []) if str(r.get('gate', '')).startswith('G5')]

def verdict_of(text, gate):
    """The verdict in the first line of text if that line names the gate (by id or role title), else None."""
    first = (text or '').strip().split('\n', 1)[0].replace('*', '').replace('`', '')
    low = first.lower()
    title = gate['title'].lower().replace(' engineer', '')
    if gate['id'].lower() not in low and not re.search(r'\b' + re.escape(title) + r'\b', low): return None
    m = VERDICT.search(first.split(':', 1)[1] if ':' in first else '')
    return m.group(1) if m else None

def on_head(text, head):
    m = re.search(r'at head ([0-9a-f]{7,40})', (text or '').replace('`', ''))
    return bool(m) and head.startswith(m.group(1))

def has_reason(text):
    """True when the first line says more than the gate name, the verdict and `at head <sha>`."""
    first = (text or '').strip().split('\n', 1)[0].replace('*', '').replace('`', '')
    rest = first.split(':', 1)[1] if ':' in first else first
    rest = re.sub(r'at head [0-9a-f]{7,40}', '', VERDICT.sub('', rest, count=1))
    return len(re.findall(r'[A-Za-z0-9]', rest)) >= 8

# One issue line: the verdict comes directly after the gate id (or range), e.g. "G3: PASS", "G1-G4: N/A (reason)".
ISSUE_LINE = re.compile(r'^[\s>*_`#-]*G([1-4])(?:\s*[-\u2013\u2014]\s*G([1-4]))?[\s*_`]*[:=\-]?[\s*_`]*([A-Za-z/]+)')

def issue_verdicts(comments):
    """Latest verdict per gate G1-G4 from the issue comments, oldest to newest (stable sort on created_at)."""
    out = {}
    for c in sorted(comments, key=lambda c: c.get('created_at') or ''):
        for line in (c.get('body') or '').split('\n'):
            m = ISSUE_LINE.match(line)
            if not m: continue
            lo, hi = int(m.group(1)), int(m.group(2) or m.group(1))
            for n in range(lo, hi + 1): out[n] = m.group(3).upper()
    return out

def evaluate(cfg, head, reviews, pr_comments, pr_body, issue_comments):
    """Return a list of problems (empty = PASS). reviews/pr_comments/issue_comments are lists of {body, commit_id?,
    submitted_at?/created_at?}. Reviews and PR comments are merged and sorted by time; the latest verdict per gate wins."""
    problems = []
    gs = gates(cfg)
    if not gs: return ['no PR review gates are registered (fail closed)']
    if not head: return ['the PR head is unknown (fail closed)']
    records = [(r.get('submitted_at') or '', r.get('body') or '') for r in reviews if not r.get('commit_id') or head.startswith(r['commit_id'][:7]) or r['commit_id'] == head]
    records += [(c.get('created_at') or '', c.get('body') or '') for c in pr_comments]
    records = [b for _, b in sorted(records, key=lambda r: r[0])]   # stable: equal or missing times keep their order
    for g in gs:
        latest = None
        for body in records:
            v = verdict_of(body, g)
            if v and on_head(body, head): latest = (v, body)       # later records win
        if latest is None: problems.append(f'gate {g["id"]} ({g["title"]}): no verdict on the current head {head[:7]}')
        elif latest[0] == 'FAIL': problems.append(f'gate {g["id"]} ({g["title"]}): FAIL on the current head')
        elif latest[0] == 'N/A' and not has_reason(latest[1]): problems.append(f'gate {g["id"]}: N/A needs a reason')
    if not re.search(r'\b(?:closes|fixes|resolves)\s+#\d+', pr_body or '', re.I): problems.append('the PR body does not say "Closes #<issue>"')
    recorded = issue_verdicts(issue_comments)
    for n in range(1, 5):
        v = recorded.get(n)
        if v is None: problems.append(f'the issue does not record G{n} as PASS or N/A')
        elif v not in ('PASS', 'N/A'): problems.append(f'the issue records G{n} as {v}, not PASS or N/A')
    return problems

def gh(*args):
    """One GitHub API call, all pages. --slurp wraps the pages in one array; a list result is flattened."""
    out = subprocess.run(['gh', 'api', '--paginate', '--slurp', *args], capture_output=True, text=True)
    if out.returncode != 0: sys.exit(f'FAIL gh api {args[0]}: {out.stderr.strip()}')
    pages = json.loads(out.stdout or '[]')
    if pages and all(isinstance(p, list) for p in pages): return [i for p in pages for i in p]
    return pages[0] if len(pages) == 1 else pages

def main():
    repo, pr = os.environ.get('REPO'), os.environ.get('PR_NUMBER')
    if not repo or not pr: sys.exit('FAIL REPO and PR_NUMBER are required (fail closed)')
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    cfg = yaml.safe_load(open(os.path.join(root, 'agents.config.yaml'), encoding='utf-8'))
    pull = gh(f'repos/{repo}/pulls/{pr}')
    reviews = gh(f'repos/{repo}/pulls/{pr}/reviews'); comments = gh(f'repos/{repo}/issues/{pr}/comments')
    m = re.search(r'\b(?:closes|fixes|resolves)\s+#(\d+)', pull.get('body') or '', re.I)
    issue = gh(f'repos/{repo}/issues/{m.group(1)}/comments') if m else []
    problems = evaluate(cfg, pull['head']['sha'], reviews, comments, pull.get('body'), issue)
    for p in problems: print('FAIL', p)
    print('gate verdicts:', 'FAIL' if problems else 'PASS')
    sys.exit(1 if problems else 0)

if __name__ == '__main__': main()
