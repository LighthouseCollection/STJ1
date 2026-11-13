# Lessons — St. John the Beloved Plenix test site

Seeded by dispatch kit 3.3. Mistakes that cost a review round, a failed deploy, or a reverted merge. Add one line each; newest last.

| # | What went wrong | Rule now |
|---|---|---|
| A-01 | Two engineers built the same issue; one finished PR was thrown away | Claim before building; the first claim wins |
| A-02 | A required check was blocked by its own cancelled run | Required checks never use `cancel-in-progress` |
| A-03 | `check \| tee log` hid failures and a broken upgrade nearly merged | Any script whose result gates a merge or release uses `set -o pipefail` |
| A-04 | Agent reports said DONE without proof | A report is a claim until `git log`, the diff, and the checks confirm it |
| A-05 | A claim about the repository was made from a stale local clone | Fetch and check the remote default branch before claiming anything about the repository |
| A-06 | A late, large merge silently dropped controls | Integrate small and often; before resolving a shared file, list what each side added and confirm both survived |
| A-07 | Choices were never written down, so layouts flip-flopped | Every choice is a decision with an enforcing check; for design, the specification shows it |
| A-08 | `main` had no branch protection and stayed red for weeks | Required checks on the default branch from day one; a red default branch is a P0 bug |
| A-09 | Two agent teams worked with different rules | One rulebook for every team and runtime; GitHub is the record every channel ends in |
| A-10 | A member was re-asked after each answer | The answer is final: act on the sensible reading, say it in one line, handle all answers in one pass |
| A-11 | A member pointed at a working example and a different one was built | When a member points at a working example, ship that example first, then improve it |
| A-12 | A "pushed" report was wrong because the branch was locked in the merge queue | Check the push result before reporting; dequeue, push, then re-queue |
| A-13 | A PR merged with an open gate change because the label arrived after it entered the queue | When requesting changes, dequeue the PR first |
| A-14 | Hand-trimmed test fixtures hid missing fields | Fixtures come from, or are checked against, the contract files |
| A-15 | An upgrade removed a file that string-only tests missed | Upgrades fetch every referenced file before merging |
| A-16 | The config said 8 slots while a document said 4 | Settings live only in the intake and its generated files; documents name them |
| A-17 | Headless agents never showed in the session list, so nobody could reach them | Every session is interactive and named; the PM has remote access where its runtime has it |
| A-18 | A personal plan's spending limit stopped every agent at once | A business seat or capped API billing for agents |
| A-19 | A rename changed only the local session name | Rename by reconnecting remote access under the session name (`pm.sh rename`) |
| A-20 | The contact agent was lost among the other agents | The PM is `STJ2 - PM` (or `STJ2 - PM (<team>)`; hyphen), others `STJ2 · <title> #<issue>` (dot), so the PM sorts first |
| A-21 | A new project's agent was started inside another project's repository | One project, one repository, one folder, one registry |
| A-22 | A password typed at the shell prompt showed on screen; a quote mark in it later broke a script | Secrets only through `dispatch.py secret`; credential files read literally; stop after one refused sign-in |
| A-23 | A decision record said "fully replaced" while its replacement said "the rest still holds", so search hid the design that applied | Partial and full replacements are recorded explicitly (§14); the specification says what applies |
| A-24 | The design specification existed in two repositories and tools read different halves | One canonical copy per source; anything else is generated |
| A-25 | An old AI memory note was quoted as a decision | AI summaries are pointers; open the source |
| A-26 | Timers woke agents every few minutes with nothing to do and used the allowance | No AI turn without new work; the watcher is plain code |
| A-27 | A deploy check ran on an empty input and reported success | Release gates are fail-closed and tested with a deliberate fault |
| A-28 | Search-engine experiments ran for days without an exit criterion | Every experiment states its exit criterion and stops when it is met or missed |
| A-29 | An agent typed into a session while a person was half-way through a message | Deliver into a session only when it is idle and its input box is empty; a screen that cannot be read counts as busy |
| A-30 | A check in the agent's own sandbox was treated as a security wall | Put hard limits where agents cannot reach them; keep host checks as guard rails |
