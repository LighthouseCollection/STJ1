# Inventory and design audit (Phase 0)

Written for issue #34 by the Engineer, read-only, from `main` at `9e82d11` (2026-11-13). Design checked against Plenix 0.89.0 (the version in `package.json`), read from the Plenix repository on the agent host at tag `v0.89.0`. Counts are from the files, not from memory.

## 1. Inventory

### Screens
36 pages in `site/pages.js` (22 in the navigation pane, 14 reached by link only, 2 drawn without the site header and navigation: sign-in and visit). One file each in `site/screens/*.jsx` (36 files), loaded when the page opens (`site/screens.js`).

| Group | Pages (`id`) |
|---|---|
| Parish | home (Dashboard) |
| People | members, member, member-new, member-edit, families, family, directory, print-form |
| Serving | ministries, ministry, servants |
| Worship | calendar, event, planning, readings |
| Giving | giving, gifts, give, bookstore |
| Communication | announcements, announcement-edit, messages, assistant |
| Library | documents, document, media, photo, reports, search |
| Administration | settings (sections by `:id`), account, welcome |
| Public | sign-in, visit, not-found |

Frame files: `site/boot.js`, `main.jsx` (draws the screen a page names), `site.jsx` (shell: header, navigation, footer), `data.js` (lists and the one data request), `pages.js`, `screens.js`. Assets: `site/assets/` (favicon, 8 SVG pictures, the icons script).

### Server routes (`server/server.js`, plain Node `http`)
| Route | What it does |
|---|---|
| `GET /healthz` | health check: database kind, Plenix version, member and gift counts |
| `GET /api/lists?names=a,b` | the parish lists a screen draws, in one answer; an unknown name is 400 |
| `POST /api/members` | create a member (validated; 400 on a bad body) |
| `PATCH /api/members/:id` | change a member |
| `PUT /api/slots/:id/signups` | replace the sign-ups of a serving slot |
| `POST /api/events/:id/rsvps` | add an RSVP (yes, maybe, no) |
| `POST /api/reset` | back to the seed; needs `x-reset-token` unless `RESET_OPEN=1` |
| `GET /`, `/index.html` | the page, with the Plenix address and version filled in; `no-cache` |
| `GET /<file>` | files of `public/`; hashed scripts kept a year (`immutable`), others `no-cache` with ETag; Brotli or gzip |
| other `/api/*` | 404; other methods 405 |

Also: a nightly reset at `RESET_HOUR` (local time; `-1` turns it off). Settings come from the environment: `PORT`, `HOST`, `DATABASE_URL`, `PLENIX_BASE`, `PLENIX_VERSION`, `PLENIX_ENGINES`, `RESET_TOKEN`, `RESET_OPEN`, `RESET_HOUR`, `SEED_ON_START`. Nginx (not the app) serves `/version.json`.

### Database (`db/`)
PostgreSQL 16 (Docker and CI) or PGlite in memory (`DATABASE_URL=pglite:memory`, the default, used by the Plenix tests). One migration, `db/migrations/001_parish.sql`, with 20 tables (settings, clergy, ministries, families, members, member_ministries, services, feasts, events, rsvps, funds, gifts, giving_months, pledges, serving_slots, signups, announcements, documents, media, bookstore_items). `db/migrate.js` applies migrations once each; `db/generate.js` makes the made-up parish; `db/seed.js` empties and refills every table in one transaction.

### Build (`build.js`, Babel standalone)
`site/` → `public/`. The frame becomes `app.<hash>.js`; each screen becomes `screens/<name>.<hash>.js` with its own modules; `index.html` gets the hashed names; `assets/` is copied, the icons script also under a hashed name. React, ReactDOM and `plenix-platform` are the CDN globals. The build fails, and writes nothing, on a compile error, an unresolved import, a screen imported by the frame, or a name `data.js` does not export. `npm run build`.

### Tests
- `test/smoke.test.js` (`npm test`): starts the server, opens all 36 pages in Chrome (main region drawn, no page error, console error or failed request); the Plenix parts VoteTally and Isolate; the speed rules of #26 (hashed, compressed, long-kept scripts; one data request per page; an unknown list is refused); the API (create and change a member, bad member refused, sign-up, RSVP, reset, health). 36 + 16 = 52 checks.
- Plenix's own browser tests (pages, keyboard, typography and more) and its static check of `site/**/*.jsx` (`tests/site-check.js`: no style prop, no color or pixel literal, only `plx-u-` classes) live in the Plenix repository and run against this site there, not here.
- CI (`.github/workflows/ci.yml`, job "Build and smoke test (PostgreSQL 16)"): checkout, `npm ci`, build, seed, smoke test, on every push and pull request. Required checks on `main` are #35.

### Deploy
`bash deploy/deploy.sh`, run by a member: packs the source, copies it to the Plenix server (VM 130), `docker compose up -d --build` (app on `127.0.0.1:8790` and PostgreSQL 16, data in `/srv/st-john/db`), writes `/srv/st-john/version.json`, installs `deploy/nginx-st-john.conf` and reloads Nginx, then waits for `/healthz`. `Dockerfile`: Node 22 Alpine, two stages (build, run as `node`). HTTPS and the sign-in are Nginx Proxy Manager's (`deploy/README.md`). Rollback: deploy the previous commit with the same script.

## 2. Design audit (plan §3)

Contract used: `DESIGN.md` and `docs/pills-and-colors.md` at Plenix `v0.89.0`. The published specification site needs a sign-in (K-0020), so no published page was opened.

### What was checked and came out clean
- **Own CSS:** none. No stylesheet, no `<style>`, no `style` attribute or prop in any `.jsx` (0 of 36 screens), no `className` except `plx-chart__line` on the custom chart in `reports.jsx` (a documented ChartFrame mark class).
- **Hex, rgb, hsl values:** none in `site/` or `server/` outside the generated icons script.
- **Parts:** 420 names are imported from `plenix-platform`; every one except `TableSettings` is a public export of `platform/index.js` at `v0.89.0`.
- **Raw HTML:** a handful only, all reasoned: `<ul>`/`<li>`/`<ol>` rows in servants and readings (with `Stack as`, `RowButton`), a status bar `<span>`, and the documented `ContextMenu` target `<div tabIndex={0}>` in `member.jsx`.
- **Sample rich text:** `announcement-edit.jsx` seeds the rich-text editor with a centered heading and a `maroon` lead-in as the person's own formatting (commented as user content). `DESIGN.md` allows inline styles in the rich-text engine, so this is reviewed and not filed. Revisit if the Plenix team reads the rule as covering content too.
- **Type sizes:** no numeric `fontSize` anywhere; sizes come from Plenix parts.

### Findings (each filed as its own bug)
Filed 2026-11-13.

| # | Finding | Severity | Issue |
|---|---|---|---|
| F1 | `TableSettings` is used in `members.jsx` but is not a Plenix 0.89.0 part (the specification lists it as Planned); a fallback hides the gap | Medium | #44 |
| F2 | No visual-regression coverage in this repository or in the Plenix tests of this site; the smoke test checks only that pages draw | Medium | #45 |
| F3 | Twelve category colors in one view: ministry tags on Members, Member and Settings (rainbow; red `food-pantry` reads like an error) | Low | #46 |
| F4 | Table columns pass `headerAlign: 'right'`, which Plenix ignores (headers always start-aligned), and physical `align: 'right'` | Low | #47 |

### Not checked, and why
- **Rendered contrast in each theme, dark-mode surfaces, wrapping pills, number alignment as drawn, more than one accent role in a view:** need the pages rendered. The full smoke test runs in CI only (D-0018), so no browser pass was run. The code side is covered by the tokens-only result above; the rendered checks belong to the Plenix browser tests or a later QA pass.
- **Per-component specification pages and Variation IDs:** the published site was not readable; the source and doc comments of each part were used instead. A member opens the published page where only that settles a question.
