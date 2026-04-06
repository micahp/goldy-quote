# Local SMTP Testing (MailHog/Mailpit)

Use a local inbox server for handoff-email testing without a paid provider or Gmail setup.

## Quick start from this repo

Start MailHog:

```bash
npm run dev:mailhog
```

Stop MailHog:

```bash
npm run dev:mailhog:stop
```

MailHog web inbox:

- `http://localhost:8025`

The helper scripts attempt Docker MailHog first, then Homebrew Mailpit service mode.

## Option B: Homebrew Mailpit

Install and run:

```bash
brew install mailpit
mailpit
```

Or run as a background service:

```bash
brew services start mailpit
brew services stop mailpit
```

## Backend env config

Set these values in `server/.env`:

```env
SMTP_HOST=127.0.0.1
SMTP_PORT=1025
SMTP_SECURE=0
SMTP_USER=dev
SMTP_PASS=dev
SMTP_FROM="GoldyQuote Dev <dev@localhost>"
HANDOFF_EMAIL_TO=micahp@utexas.edu
```

Notes:

- `SMTP_USER` and `SMTP_PASS` must be non-empty in the current implementation.
- MailHog/Mailpit both accept dummy values for auth in local testing.

## Verify end-to-end

1. Start frontend + backend: `npm run dev:all`
2. Complete the intake flow and click `Send To Agent`.
3. Open `http://localhost:8025` and confirm the message appears.
