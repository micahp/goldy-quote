#!/usr/bin/env bash
set -euo pipefail

stopped=0

if command -v docker >/dev/null 2>&1; then
  if docker info >/dev/null 2>&1; then
    if docker ps --format '{{.Names}}' | rg '^mailhog$' >/dev/null 2>&1; then
      docker stop mailhog >/dev/null
      echo "Stopped MailHog Docker container."
      stopped=1
    fi
  fi
fi

if command -v brew >/dev/null 2>&1; then
  mailpit_status="$(brew services list | awk '$1 == "mailpit" { print $2 }')"
  if [ "${mailpit_status}" = "started" ]; then
    brew services stop mailpit >/dev/null
    echo "Stopped Mailpit Homebrew service."
    stopped=1
  fi
fi

if [ "${stopped}" -eq 0 ]; then
  echo "No running local SMTP inbox process found via Docker or Homebrew."
fi
