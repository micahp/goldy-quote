#!/usr/bin/env bash
set -euo pipefail

if command -v docker >/dev/null 2>&1; then
  if docker info >/dev/null 2>&1; then
    if docker ps -a --format '{{.Names}}' | rg '^mailhog$' >/dev/null 2>&1; then
      docker start mailhog >/dev/null
    else
      docker run -d --name mailhog -p 1025:1025 -p 8025:8025 mailhog/mailhog >/dev/null
    fi
    echo "MailHog is running with Docker."
    echo "SMTP: 127.0.0.1:1025"
    echo "UI:   http://localhost:8025"
    exit 0
  fi
fi

if command -v brew >/dev/null 2>&1; then
  if ! brew list mailpit >/dev/null 2>&1; then
    echo "Mailpit is not installed via Homebrew. Installing..."
    brew install mailpit
  fi
  brew services start mailpit >/dev/null
  echo "Mailpit is running with Homebrew."
  echo "SMTP: 127.0.0.1:1025"
  echo "UI:   http://localhost:8025"
  exit 0
fi

echo "Unable to start local SMTP inbox automatically."
echo "Install and run either Docker Desktop (MailHog) or Homebrew Mailpit."
exit 1
