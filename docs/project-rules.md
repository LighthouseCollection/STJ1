# St. John the Beloved Plenix test site: project rules

Written once by dispatch kit 3.3 (Project Plan 3.3); this file now belongs to the project. Every agent follows it together with `.agents/RULES.md`. It adds to those rules and never weakens them.

Add short, definitive rules here as the project needs them, each by a PR that links a recorded decision.

## Rules
- **The smoke test runs in CI, not on the agent host (D-0018).** Don't run `npm test` (`node test/smoke.test.js`, the full Chrome smoke test) on the agent host. It needs more memory than an agent has, and the host stops an agent that runs out. CI's "Build and smoke test" job runs it on every PR; read its result there (`gh pr checks <n> -R LighthouseCollection/STJ1`). On the host, run `npm run build` and only the check your change needs, one page at a time.
- **Reading the Plenix specification (D-0018).** The published specification site (https://design-system.lighthouseway.org) asks the agent host to sign in, so agents can't open its pages; the CDN files (`/cdn/`) need no sign-in. Read the specification from the Plenix repository on the host, at the version this project uses (0.89.0, D-0002): `git -C /home/agents/pds/work/pds show v0.89.0:<path>`. Start with `DESIGN.md` (the design contract) and `platform/design-system/STANDARD.md`; a component's behavior is in its source and tests under `platform/`. Only read that repository: it belongs to the PDS team. When only a page of the published site settles a question, say so on the issue; a member opens it.
