# Master plan — St. John the Beloved Plenix test site

Written once by dispatch kit 3.3 (Project Plan 3.3); this file now belongs to the project. The lead PM keeps it (plan §4).

Reviewed at every release (a "Plan review" issue). Members are asked for goals once (D-0012), only if the intake and the repository do not answer it.

## 1. Vision
St. John the Beloved Coptic Orthodox Church: the Plenix test site. A church database and membership web app with made-up data, built only from Plenix; every automatic browser test of Plenix runs here.

## 2. Users and outcomes
Users: the parish staff and servants who would run a church database (played by made-up data), and the Plenix team, whose browser tests run against this site.

Outcomes are inferred from the intake, the open issues and the repository (first filled 2026-11-13). Members correct them at the first plan review.

| # | Outcome | Measure |
|---|---|---|
| O1 | Every Plenix browser test runs green against the site | The smoke test on `main` is green; a red `main` is a P0 bug (lesson A-08) |
| O2 | The site uses only Plenix: no CSS, hex values or parts of its own | The design audit (Phase 0) finds no own CSS or hex values; open findings are 0 at each release |
| O3 | The site is fast, by the owner's performance standard (#26) | All eight rules of #26 in place |
| O4 | The site shows what the owner asked for | Owner requests (#8, #9) delivered with before-and-after screenshots |
| O5 | Parish data can come from ChurchCRM behind Plenix screens, if the owner takes it (#10) | The three pilot screens (#13, #14, #15) read from ChurchCRM |

## 3. Scope and non-goals
- **In:** the site's screens, server, build, tests and deploy script; issues for Plenix filed on the Plenix side and linked here.
- **Non-goals:** editing Plenix itself (it is owned by the Plenix team); real parish data (all data is made up); Arabic and right-to-left work for now (owner, 2026-10-30, on #10).

## 4. Milestones
- **M0 · Foundation (Phase 0, now).** Required CI checks, the Phase 0 inventory and design audit, workflow skills, the launch test (G0), and the open fixes: #28 (PR #29), #33 (PR #22).
- **M1 · Owner requests and speed.** #8 header name, #9 group icons, #26 performance rules 1–8 (PR #27 covers 1–3).
- **M2 · ChurchCRM pilot**, only if a member takes ChurchCRM on #10: #12, then #13, #14, #15. #16 tracks the screens ChurchCRM cannot host.

## 5. Epics
| id | outcome served | packages | milestone | status |
|---|---|---|---|---|
| E1 Phase 0 foundation | O1, O2 | CI, docs | M0 | Ready: #34 inventory and design audit, #35 required CI checks |
| E2 Small fixes from the Plenix team | O1 | server, test, deploy | M0 | #28 in review (PR #29) |
| E3 Directory reflow at 320px | O2 | site | M0 | #33 in progress (PR #22) |
| E4 Header name | O4 | site | M1 | #8 in progress |
| E5 Navigation group icons | O4 | site | M1 | #9 Ready |
| E6 Performance standard | O3 | build, server, site | M1 | #26: PR #27 waits for a member's merge; rules 4–8 follow |
| E7 ChurchCRM pilot | O5 | server, site | M2 | Waits for a member's answer on #10 |

## 6. Lanes and owners
From `agents.config.yaml`: team `core`; slots and the Ready buffer are settings there, not repeated here.

| Lane | Role |
|---|---|
| Spec, plan, records | `pm` (STJ2 - PM) |
| Build | `engineer` |
| Verify | `qa`, `code-reviewer` (PR review gates) |

No Design Director role is registered, so the design audit (plan §3) needs role discovery (plan §5.9) or a member's choice.

## 7. Evergreen backlog
_None recorded yet. Findings from the Phase 0 design audit land here, each linking its issue._

## 8. Risks and open decisions
- #10 ChurchCRM: an earlier answer was relayed in chat by the old team's Business Analyst (2026-10-30). Under the STJ2 rules a member's answer counts only from their own words, so M2 waits for a member's answer on #10.
- Merges are PR-only: every PR waits for a member, so the Ready buffer can outrun merges.
- Kit guard false positives met by the PM on 2026-11-13: K-0015, K-0017 (kit log).

## 9. Change log
- 2026-11-13: first filled by STJ2 - PM after cutover (#32), per the plan the member accepted on #31.
