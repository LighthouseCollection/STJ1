# St. John the Beloved Coptic Orthodox Church: the Plenix test site

A church database and membership web app with made-up data, built only from [Plenix](https://github.com/plenix-ds/plenix-platform).
Every automatic browser test of Plenix runs here (owner, 2026-10-25). It has nothing to do with the design spec.

- **Address:** https://stjohn.lighthouseway.org (behind Authentik, like the design system).
- **Made-up data only:** 120 families, 469 members, 10,000 gifts, the parish's ministries, servants, events and the liturgical calendar. Every person, family, address and gift is made up.
- **Rules:** there are no sacrament records anywhere, and no table for them. People who serve are "servants".
- **Plenix:** loaded like any outside app, from `https://design-system.lighthouseway.org/cdn/<version>/` (the version is `"plenix"` in package.json). `PLENIX_BASE` points it elsewhere; the Plenix tests point it at their own build. The page loads `plenix-engines.js` (rich text, charts, PDF) after `plenix.js` when that file exists at the address (checked once at startup); releases before it have no such file and get no tag.
- **Icons:** `site/assets/plenix-icons-st-john.js`, loaded after `plenix.js`, registers exactly the icons the site names, so each draws from its own module (Plenix #557).
  - It is generated: never edit it. After a screen adds or changes an icon, write it again from a Plenix checkout with `node <plenix>/tools/icons/site-icons.js st-john site --out site/assets`. The generator stops on an unknown name.
  - On a Plenix without `registerIcons` (0.73.0 and before) the file registers nothing and warns once in the console, and the icons draw as before.

## Parts

| Part | Where | What |
|---|---|---|
| Pages | `site/` | 35 screens (`site/screens/`), routes in `site/pages.js`, the frame in `site/site.jsx`. `node build.js` compiles the frame to `public/app.<hash>.js` and each screen to its own `public/screens/<name>.<hash>.js`, loaded when the screen opens (`site/screens.js`). |
| Server | `server/server.js` | Node 22 with one library (`pg`). It serves the page, the pictures and the JSON API (`/api/lists?names=…`, saves, `/api/reset`, `/healthz`). It resets to the seed every night at 3:00 (New York time). |
| Database | `db/` | PostgreSQL 16. Numbered migrations in `db/migrations/` (`node db/migrate.js`); the seed (`node db/seed.js`) comes from the fixed generator in `db/generate.js`. |
| Tests | `test/smoke.test.js` | Every page in Chrome, plus the API's saves and the reset (`npm test`). CI runs it against a throwaway PostgreSQL. |
| Server setup | `Dockerfile`, `docker-compose.yml`, `deploy/` | The app and PostgreSQL in Docker on the Plenix server (VM 130). Deploy with `bash deploy/deploy.sh`. |

## Speed (issue #26)

- **Cached code:** every built script has the hash of its content in its name. The server sends it compressed (brotli or gzip) with `Cache-Control: public, max-age=31536000, immutable`. The page itself (`index.html`) is `no-cache`, so a new build is picked up at once.
- **Code per screen:** the frame (`app.<hash>.js`, about 33 KB) holds no screen. A screen's file loads when it first opens; the screens a person likely opens next (`NEXT` in `site/screens.js`) have their files fetched while the browser is idle (code only, never data).
- **One data request per screen:** a screen asks for the lists it reads in one `GET /api/lists?names=…`, side by side with its file, never after it. `build.js` works out each screen's lists from the names it imports from `site/data.js`. A list once read stays for the visit; nothing loads the whole database.

## Running it on a computer

```
npm ci
node build.js
DATABASE_URL=pglite:memory node server/server.js     # PostgreSQL in the process (PGlite), a fresh database each start
```

Then open http://localhost:8790. With a PostgreSQL server, set `DATABASE_URL=postgres://user:pass@host:5432/stjohn`.

## Settings (environment)

| Setting | Default | What |
|---|---|---|
| `PORT` | 8790 | The port. |
| `DATABASE_URL` | `pglite:memory` | `postgres://…` (the server, CI) or `pglite:memory`. |
| `PLENIX_VERSION` | `plenix` in package.json | The Plenix release loaded from the CDN. |
| `PLENIX_BASE` | the CDN of that version | Another address for the Plenix files: `plenix.js`, `plenix.css`, `theme-boot.js`, `fonts.css` and, from the release that has it, `plenix-engines.js` (the Plenix tests use their own build). |
| `PLENIX_ENGINES` | probed at startup | `1` loads `plenix-engines.js`, `0` does not, whatever the address holds. Without it the server asks for the file once (a 200 that is not an HTML page counts; a redirect does not). |
| `RESET_TOKEN` | none | Needed in the `x-reset-token` header for `POST /api/reset`. |
| `RESET_OPEN` | off | `1` lets anyone reset (tests only). |
| `RESET_HOUR` | 3 | The hour of the nightly reset; `-1` turns it off. |
| `SEED_ON_START` | off | `1` resets to the seed on every start (the database is seeded anyway when it is empty). |
