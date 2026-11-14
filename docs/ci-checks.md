# Required CI checks (plan section 9, gate G0)

Workflows: `.github/workflows/ci.yml` (build and smoke test) and `.github/workflows/checks.yml` (the rest). Scripts and
their tests are in `ci/`; run them locally with `python3 -m unittest discover -s ci` and `python3 ci/checks.py design|process`.

## What a member switches on (GitHub branch protection for `main`)
Settings, Branches, rule for `main`:
1. Require a pull request before merging. Block force pushes. Block deletion.
2. Require status checks to pass before merging, and "Require branches to be up to date". Add exactly these four:
   - `Build and smoke test (PostgreSQL 16)`
   - `Design and code checks`
   - `Process checks`
   - `Gate verdicts`
3. Do not restrict who can push beyond the above; the bot identity must not be allowed to merge (plan 9.4).
Order: merge the PR that adds these workflows first, then switch the rule on (a check must have run once to be selectable;
the gate job cannot run on the PR that adds it, because the script comes from the base branch).

## Checks
| Plan check | Status | Where |
|---|---|---|
| 1 colors, 3 physical left/right | Run: scans `site/` own code; known cases in `ci/design-baseline.json` | `Design and code checks` |
| 9 locked choice | Run: package.json, D-0002, rules agree on the Plenix version | `Design and code checks` |
| 2 scales and minimums, 4 token tiers | Planned: needs the specification's scales; part of the design audit (#34) | not run |
| 5 contrast, 6 states vs stories, 7 numeric columns | N/A: the site has no components of its own; Plenix owns them | not run |
| 8 visual regression | Planned: the smoke test runs Chrome but takes no screenshots yet | not run |
| 10 specification check | Planned: reads the published specification at the pinned version | not run |
| 11 registry, 12 settings in prose, 13 decisions, 14 instruction drift | Run (check 11 reads the committed registry; "regenerates from the intake" stays with the kit) | `Process checks` |
| 15 gate verdicts | Run: every `gate` role in the registry needs PASS or N/A with a reason, at the PR's current head, and the issue records G1-G4 | `Gate verdicts` |

## Gate verdicts
A verdict is a PR review or PR comment whose first line names the gate and says `PASS`, `FAIL` or `N/A <reason>`, plus
`at head <sha>` (7 or more characters), for example `**QA gate: PASS** at head 9185e81`. A new push makes earlier verdicts
stale. The issue the PR closes must record G1-G4 as PASS or N/A (one comment `G1-G4: N/A (reason)` is enough). After a
verdict arrives, the job re-runs on its own (review events); after an issue comment, re-run the job.

The latest record per gate wins, with PR reviews and PR comments merged and sorted by time. A bare `N/A` (no reason after
the head) fails. On the issue, the verdict must come right after the gate id (`G3: PASS`, `G1-G4: N/A (reason)`); a later
`FAIL` or any other word fails that gate. **Limit:** the check cannot tell who wrote a verdict, because every agent and
member comments through one shared GitHub identity. Any comment in the right format counts, so branch protection and member
review remain the real control.
