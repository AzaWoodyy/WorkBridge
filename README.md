# WorkBridge

WorkBridge is a local-first desktop app that unifies planning across GitLab, ClickUp, and Rocket.Chat.

## Requirements

- macOS (Apple Silicon recommended)
- Node.js 22 (repo pinned via `.nvmrc`)

## Local Dev (macOS)

This project uses native Electron modules (`better-sqlite3`, `keytar`).

Use the repo-local Node version:

```bash
nvm use
npm install
npm run dev
```

If you don’t have Node 22 installed yet:

```bash
nvm install 22
nvm use
```

## Build (macOS)

```bash
npm run pack:mac
```

## Notes

- Tokens are stored in macOS Keychain (via `keytar`).
- The local DB lives in the Electron user data directory (not in this repo).
- This repo does not include any real API keys or secrets.
