"""Tests for the CI checks, each with a deliberate fault so a check that cannot fail is caught (lesson A-27).
Run: python3 -m unittest discover -s ci -v"""
import os, shutil, sys, tempfile, unittest
sys.path.insert(0, os.path.dirname(__file__))
import checks, gate
import yaml

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SHA = 'a' * 40

class Repo(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        for item in ('site', 'decisions', 'docs', '.agents', 'ci', '.github', 'agents.config.yaml', 'package.json', 'CLAUDE.md', 'README.md'):
            src = os.path.join(ROOT, item); dst = os.path.join(self.tmp, item)
            shutil.copytree(src, dst) if os.path.isdir(src) else shutil.copy(src, dst)
    def tearDown(self): shutil.rmtree(self.tmp)
    def edit(self, rel, fn):
        p = os.path.join(self.tmp, rel); s = open(p, encoding='utf-8').read(); open(p, 'w', encoding='utf-8').write(fn(s))
    def write(self, rel, s):
        p = os.path.join(self.tmp, rel); os.makedirs(os.path.dirname(p), exist_ok=True); open(p, 'w', encoding='utf-8').write(s)

class Design(Repo):
    def test_clean_repo_passes(self): self.assertEqual(checks.design(self.tmp), [])
    def test_hex_color_fails(self):
        self.write('site/screens/x.jsx', "const s = { color: '#ff0000' }\n"); self.assertTrue(any('check 1' in p for p in checks.design(self.tmp)))
    def test_rgb_fails(self):
        self.write('site/screens/x.jsx', "const s = 'rgb(1,2,3)'\n"); self.assertTrue(checks.design_scan(self.tmp))
    def test_physical_direction_fails(self):
        self.write('site/screens/x.jsx', "const s = { marginLeft: 4 }\n"); self.assertTrue(any('check 3' in p for p in checks.design(self.tmp)))
    def test_issue_number_in_comment_is_not_a_color(self):
        self.write('site/screens/x.jsx', "// see Plenix #557 for the icons\n"); self.assertEqual(checks.design_scan(self.tmp), [])
    def test_no_site_fails_closed(self):
        shutil.rmtree(os.path.join(self.tmp, 'site')); os.makedirs(os.path.join(self.tmp, 'site')); self.assertTrue(checks.design_scan(self.tmp))
    def test_version_drift_fails(self):
        self.edit('package.json', lambda s: s.replace('0.89.0', '0.90.0')); self.assertTrue(any('check 9' in p for p in checks.design(self.tmp)))

class Process(Repo):
    def test_clean_repo_passes(self): self.assertEqual(checks.process(self.tmp), [])
    def test_role_without_definition_fails(self):
        self.edit('agents.config.yaml', lambda s: s.replace('definition: .agents/qa.md', 'definition: .agents/missing.md')); self.assertTrue(any('check 11' in p for p in checks.process(self.tmp)))
    def test_no_pm_fails(self):
        self.edit('agents.config.yaml', lambda s: s.replace('kind: coordinator', 'kind: lane')); self.assertTrue(any('PM' in p for p in checks.registry(self.tmp)))
    def test_setting_in_prose_fails(self):
        self.write('docs/x.md', 'We run 4 slots per team.\n'); self.assertTrue(any('check 12' in p for p in checks.process(self.tmp)))
    def test_duplicate_decision_fails(self):
        shutil.copy(os.path.join(self.tmp, 'decisions/D-0001.yaml'), os.path.join(self.tmp, 'decisions/D-0099.yaml'))
        self.assertTrue(any('D-0099' in p or 'duplicate' in p for p in checks.decisions(self.tmp)))
    def test_decision_without_check_fails(self):
        self.edit('decisions/D-0005.yaml', lambda s: '\n'.join(l for l in s.split('\n') if not l.startswith('check:'))); self.assertTrue(any('no check' in p for p in checks.decisions(self.tmp)))
    def test_design_decision_without_spec_section_fails(self):
        self.edit('decisions/D-0002.yaml', lambda s: s.replace('spec_section:', 'spec_section: null #')); self.assertTrue(any('spec_section' in p for p in checks.decisions(self.tmp)))
    def test_instruction_drift_fails(self):
        self.edit('CLAUDE.md', lambda s: s + '\n- an extra rule\n'); self.assertTrue(any('check 14' in p for p in checks.process(self.tmp)))

class Workflows(Repo):
    def test_clean_passes(self): self.assertEqual(checks.workflows(self.tmp), [])
    def test_cancel_in_progress_fails(self):
        self.edit('.github/workflows/checks.yml', lambda s: s.replace('jobs:', 'concurrency:\n  group: x\n  cancel-in-progress: true\njobs:', 1)); self.assertTrue(any('A-02' in p for p in checks.workflows(self.tmp)))
    def test_missing_pipefail_shell_fails(self):
        self.edit('.github/workflows/ci.yml', lambda s: s.replace('    shell: bash', '    shell: sh')); self.assertTrue(any('A-03' in p for p in checks.workflows(self.tmp)))

CFG = yaml.safe_load(open(os.path.join(ROOT, 'agents.config.yaml'), encoding='utf-8'))
def review(first, sha=SHA): return {'body': first + '\n\nmore', 'commit_id': sha}
OK = [review('**QA gate: PASS** at head `%s` (PR #1)' % SHA[:7]), review('**Code Reviewer gate G5a: PASS** at head `%s`' % SHA[:7])]
ISSUE = [{'body': 'G1-G4: N/A (small build issue)'}]
BODY = 'Closes #35'

class Gate(unittest.TestCase):
    def run_gate(self, reviews=OK, comments=(), body=BODY, issue=ISSUE, head=SHA): return gate.evaluate(CFG, head, list(reviews), list(comments), body, list(issue))
    def test_all_pass(self): self.assertEqual(self.run_gate(), [])
    def test_no_verdicts_fails(self): self.assertEqual(len(self.run_gate(reviews=[])), 2)
    def test_empty_input_fails_closed(self): self.assertTrue(self.run_gate(reviews=[], body='', issue=[], head=''))
    def test_stale_head_fails(self): self.assertTrue(self.run_gate(head='b' * 40))
    def test_fail_verdict_fails(self):
        self.assertTrue(any('FAIL' in p for p in self.run_gate(reviews=[review('**QA gate: FAIL** at head `%s`' % SHA[:7]), OK[1]])))
    def test_later_pass_supersedes_earlier_fail(self):
        self.assertEqual(self.run_gate(reviews=[review('**QA gate: FAIL** at head `%s`' % SHA[:7])] + OK), [])
    def test_na_with_reason_passes(self):
        self.assertEqual(self.run_gate(reviews=[review('**QA gate: N/A** at head `%s`, no behavior changed' % SHA[:7]), OK[1]]), [])
    def test_bare_na_fails(self):
        self.assertTrue(self.run_gate(reviews=[review('QA gate: N/A'), OK[1]]))
    def test_missing_issue_record_fails(self): self.assertTrue(any('G1' in p for p in self.run_gate(issue=[{'body': 'claiming'}])))
    def test_each_gate_listed_individually(self):
        self.assertEqual(self.run_gate(issue=[{'body': 'G1: N/A\nG2: N/A\nG3: PASS\nG4: PASS'}]), [])
    def test_no_closes_fails(self): self.assertTrue(any('Closes' in p for p in self.run_gate(body='no link')))
    def test_no_gates_registered_fails_closed(self): self.assertTrue(gate.evaluate({'roles': []}, SHA, OK, [], BODY, ISSUE))

if __name__ == '__main__': unittest.main()
