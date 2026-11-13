#!/usr/bin/env python3
"""Gate check (plan 9.2 check 15): passes only when every applicable PR review gate has recorded PASS, or N/A with a
reason, on the PR's CURRENT head, and the linked issue records G1-G4 as PASS or N/A. Fail closed: anything missing,
unreadable or ambiguous is a FAIL (lesson A-27). Needs GH_TOKEN, REPO and PR_NUMBER in the environment.

A verdict is a PR review (or PR comment) whose first line names the gate, e.g.
  **QA gate: PASS** at head `<sha>` ...      **Code Reviewer gate G5a: PASS** at head `<sha>` ...
The gates come from agents.config.yaml: every role with a `gate` of G5a-G5e and `applies: always`. A gate whose
`applies` is not "always" must still show a verdict (PASS or N/A with a reason) so nothing is skipped silently.
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

def evaluate(cfg, head, reviews, pr_comments, pr_body, issue_comments):
    """Return a list of problems (empty = PASS). reviews/pr_comments/issue_comments are lists of {body, commit_id?}."""
    problems = []
    gs = gates(cfg)
    if not gs: return ['no PR review gates are registered (fail closed)']
    if not head: return ['the PR head is unknown (fail closed)']
    records = [(r.get('body') or '') for r in reviews if not r.get('commit_id') or head.startswith(r['commit_id'][:7]) or r['commit_id'] == head]
    records += [(c.get('body') or '') for c in pr_comments]
    for g in gs:
        latest = None
        for body in records:
            v = verdict_of(body, g)
            if v and on_head(body, head): latest = (v, body)       # later records win
        if latest is None: problems.append(f'gate {g["id"]} ({g["title"]}): no verdict on the current head {head[:7]}')
        elif latest[0] == 'FAIL': problems.append(f'gate {g["id"]} ({g["title"]}): FAIL on the current head')
        elif latest[0] == 'N/A' and len(latest[1].strip().split('\n', 1)[0]) < 25: problems.append(f'gate {g["id"]}: N/A needs a reason')
    if not re.search(r'\b(?:closes|fixes|resolves)\s+#\d+', pr_body or '', re.I): problems.append('the PR body does not say "Closes #<issue>"')
    text = '\n'.join(c.get('body') or '' for c in issue_comments)
    for n in range(1, 5):
        rng = re.search(r'G1\s*[-–—]\s*G4[^\n]*?\b(PASS|N/A)\b', text)
        one = re.search(rf'\bG{n}\b[^\n]*?\b(PASS|N/A)\b', text)
        if not (one or rng): problems.append(f'the issue does not record G{n} as PASS or N/A')
    return problems

def gh(*args):
    out = subprocess.run(['gh', 'api', '--paginate', *args], capture_output=True, text=True)
    if out.returncode != 0: sys.exit(f'FAIL gh api {args[0]}: {out.stderr.strip()}')
    text = out.stdout.strip()
    # --paginate prints one JSON array per page; join them
    return json.loads('[' + text.replace('][', '],[') + ']') if text.startswith('[') and '][' in text else json.loads(text or '[]')

def main():
    repo, pr = os.environ.get('REPO'), os.environ.get('PR_NUMBER')
    if not repo or not pr: sys.exit('FAIL REPO and PR_NUMBER are required (fail closed)')
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    cfg = yaml.safe_load(open(os.path.join(root, 'agents.config.yaml'), encoding='utf-8'))
    pull = gh(f'repos/{repo}/pulls/{pr}')
    reviews = gh(f'repos/{repo}/pulls/{pr}/reviews'); comments = gh(f'repos/{repo}/issues/{pr}/comments')
    flat = lambda x: [i for p in x for i in p] if x and isinstance(x[0], list) else x
    m = re.search(r'\b(?:closes|fixes|resolves)\s+#(\d+)', pull.get('body') or '', re.I)
    issue = flat(gh(f'repos/{repo}/issues/{m.group(1)}/comments')) if m else []
    problems = evaluate(cfg, pull['head']['sha'], flat(reviews), flat(comments), pull.get('body'), issue)
    for p in problems: print('FAIL', p)
    print('gate verdicts:', 'FAIL' if problems else 'PASS')
    sys.exit(1 if problems else 0)

if __name__ == '__main__': main()
