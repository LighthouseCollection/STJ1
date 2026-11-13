#!/usr/bin/env bash
# St. John the Beloved test site · build and (re)start it on the Plenix server (VM 130, 10.0.0.30). From Git Bash, in the
# repository: bash deploy/deploy.sh   (needs this PC's SSH key on plenix@10.0.0.30)
#   1. the source goes to /srv/st-john/src and docker compose builds and starts the app and PostgreSQL 16
#      (data in /srv/st-john/db; the password and the reset token in /srv/st-john/.env, made once on the server, never in git);
#   2. the server's Nginx gets the st-john site file (deploy/nginx-st-john.conf) and is reloaded;
#   3. the health check answers through Nginx (the script exits with an error if it never does).
# HTTPS, the address and the Authentik sign-in are Nginx Proxy Manager's (CT 102): see deploy/README.md.
set -euo pipefail
HOST=plenix@10.0.0.30
cd "$(dirname "$0")/.."
# what /version.json says (owner, version-json-33): the site's version, the commit ("-dirty" when the tree has uncommitted
# changes) and the time of the deploy; the Plenix version is package.json "plenix" unless the server's .env sets PLENIX_VERSION
SITE_VERSION=$(node -p "require('./package.json').version")
PLENIX=$(node -p "require('./package.json').plenix")
COMMIT=$(git rev-parse --short HEAD)$(git diff --quiet HEAD -- || echo -dirty)
PUBLISHED=$(date -u +%Y-%m-%dT%H:%M:%SZ)
PKG=$(mktemp -u).tgz
tar -czf "$PKG" --exclude=node_modules --exclude=public --exclude=.git Dockerfile docker-compose.yml package.json package-lock.json build.js site server db deploy
SUM=$(sha256sum "$PKG" | cut -d' ' -f1)
scp -q "$PKG" "$HOST:/tmp/st-john-src.tgz"
rm -f "$PKG"
ssh "$HOST" "set -e
  echo '$SUM  /tmp/st-john-src.tgz' | sha256sum -c --quiet -
  sudo mkdir -p /srv/st-john/db
  sudo rm -rf /srv/st-john/src.new && sudo mkdir -p /srv/st-john/src.new
  sudo tar -xzf /tmp/st-john-src.tgz -C /srv/st-john/src.new --no-same-owner && rm /tmp/st-john-src.tgz
  sudo rm -rf /srv/st-john/src.old; if [ -d /srv/st-john/src ]; then sudo mv /srv/st-john/src /srv/st-john/src.old; fi
  sudo mv /srv/st-john/src.new /srv/st-john/src
  if [ ! -f /srv/st-john/.env ]; then
    printf 'DB_PASSWORD=%s\nRESET_TOKEN=%s\n' \"\$(openssl rand -hex 24)\" \"\$(openssl rand -hex 24)\" | sudo tee /srv/st-john/.env >/dev/null
    sudo chmod 600 /srv/st-john/.env
  fi
  sudo cp /srv/st-john/.env /srv/st-john/src/.env
  cd /srv/st-john/src && sudo docker compose up -d --build --quiet-pull 2>&1 | tail -3
  # /version.json: Nginx serves this file (deploy/nginx-st-john.conf); name, versions, commit and time only
  # an empty or missing PLENIX_VERSION= falls back to package.json "plenix" on purpose; the value is cleaned (first line, version characters only)
  P=\$(sudo grep -s '^PLENIX_VERSION=' /srv/st-john/.env | cut -d= -f2 | head -1 | tr -cd '0-9A-Za-z._+-'); P=\${P:-$PLENIX}
  printf '{\"name\": \"St. John test site\", \"version\": \"$SITE_VERSION\", \"plenix\": \"%s\", \"commit\": \"$COMMIT\", \"publishedAt\": \"$PUBLISHED\"}\n' \"\$P\" | sudo tee /srv/st-john/version.json >/dev/null
  sudo chmod 644 /srv/st-john/version.json
  sudo cp /srv/st-john/src/deploy/nginx-st-john.conf /etc/nginx/sites-available/st-john
  sudo ln -sf /etc/nginx/sites-available/st-john /etc/nginx/sites-enabled/st-john
  sudo nginx -t -q && sudo systemctl reload nginx
  for i in \$(seq 1 30); do curl -sf -H 'Host: stjohn.lighthouseway.org' http://127.0.0.1/healthz && exit 0; sleep 2; done; echo 'The health check never answered' >&2; exit 1"
echo "Deployed. Reset by hand: ssh $HOST then curl -X POST -H \"x-reset-token: \$(sudo grep RESET_TOKEN /srv/st-john/.env | cut -d= -f2)\" http://127.0.0.1:8790/api/reset"
