# Putting St. John on the server

The owner approved this (2026-10-25): stjohn.lighthouseway.org, Node and PostgreSQL in Docker on VM 130, behind Authentik.

1. **The app and the database:** run `bash deploy/deploy.sh` from this repository. It uploads the source, starts the two containers with `docker compose` and adds the server's Nginx site file. The health check answers on the VM at `http://127.0.0.1/healthz`, with the header `Host: stjohn.lighthouseway.org`; the script exits with an error if it never answers. The update runs no test except this up-check.
2. **DNS (GoDaddy, lighthouseway.org):** add a CNAME record from `stjohn` to `npm.lighthouseway.org`, like plenix and design-system. A wildcard record sends unknown names to another address, so the CNAME is needed.
3. **Authentik (CT 104):** add a Proxy provider for `https://stjohn.lighthouseway.org` (forward auth, single application) and the application "st-john". Then add the provider to the embedded outpost and allow the Admins and Editors groups, like "plenix".
4. **Nginx Proxy Manager (CT 102):** add a proxy host `stjohn.lighthouseway.org` → `http://10.0.0.30:80` with a Let's Encrypt certificate, then force SSL and HSTS (NPM clears them when it creates the certificate, so set them again with an update). Its advanced config is the Authentik check of host 27 (plenix: every request signs in). Back up `/root/data/database.sqlite` first and dry-run, as the hosting notes say.
5. **Check:** the address opens after signing in, a new member saves, and the nightly reset runs (`docker logs st-john-app-1` shows it at 3:00).
