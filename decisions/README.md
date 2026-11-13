# St. John the Beloved Plenix test site decision log

Written once by dispatch kit 3.3 (Project Plan 3.3); this file now belongs to the project. The rules are plan §14.

One file per decision, `D-NNNN.yaml`. Fields:

- `id`, `date`, `area`, `decided_by` (the member, or a role applying a member's recorded answer);
- `decision`, `why`, `options`;
- `status`: `active`, `superseded`, or `retired`;
- `superseded_by`: `null`; one id for a full replacement (`D-0123`); or, for a partial replacement, a list such as `[{id: D-0123, scope: "the row height only"}]`, in which case the decision stays `active` for the rest;
- `supersedes`: the id this decision replaces, if any;
- `spec_section`: for a design decision, the published specification section it changed (`null` otherwise);
- `check`: the test that enforces it, or `review only: <reason>`.

**Numbering.** D-0001 to D-0008 are the intake decisions and D-0009 to D-0015 the Foundation decisions (plan §14). Every later decision takes the next number after the highest on the default branch, never below D-0016; the lead PM keeps the numbering. CI fails on a duplicate number; the later PR renumbers.

**The log is history.** It says why, when, and who. What the design is lives only in the published specification (https://design-system.lighthouseway.org/); a design decision is not done until the specification shows it. Rules live in `.agents/RULES.md` and `docs/project-rules.md`.

**A past decision is never rewritten.** Only `status`, `superseded_by` and `check` may change. Any member may decide; when two members decide differently, the later recorded decision supersedes the earlier one, linked.

D-0001 to D-0008 come from the intake. When an intake answer changes, `dispatch.py build` writes a new decision that supersedes the earlier one.
