# Contributing to WorkBridge

WorkBridge is an MIT-licensed personal desktop project. Small, focused pull requests are welcome. Describe the problem and expected behavior before proposing a large architecture or integration change.

## Set up

Use Node 22.12+ and npm. macOS is the desktop verification target; Linux CI covers logic and compilation. Clone the repository, run `npm ci`, then `npm run demo` to work with fictional data. Never use a real account or database in automated checks or screenshots.

Native SQLite binaries target either Node or Electron:

```sh
npm ci --ignore-scripts
npm run test:prepare
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
```

To launch Electron after those checks:

```sh
node node_modules/electron/install.js
npm run postinstall
npm run demo
```

`npm run format` applies formatting. Keep the lockfile in sync with `package.json`. Do not commit tokens, local databases, private hostnames, user configuration, build products or account screenshots.

## Changes and validation

Use focused conventional commits, such as `fix(sync): preserve local planning state`. Explain what changed, why, and which checks were actually run. Separate local checks, GitHub CI and manual app verification in the PR description. Include demo screenshots for visible changes. A green build does not prove a screen works.

Keep committed tests focused on pure logic and main-process persistence. Use mocked HTTP responses and real in-memory SQLite; never require network accounts. Exercise failures, partial responses, stable identity and preservation of personal state when changing sync. Manual Electron checks should cover Inbox, Planner, Cmd+K and Settings.

Validate all new IPC arguments in `src/main/ipc/contracts.ts`, expose a narrow preload method, and put the handler with its source or domain. Keep remote credentials and network operations in the main process.

## Database changes

`src/main/db/schema.ts` defines the schema. Run `npm run db:generate`, inspect the SQL and commit migrations and snapshots together. Do not alter an already shipped migration. Audit triggers belong in explicit custom migrations.

The initial baseline uses `IF NOT EXISTS` to adopt historical databases. Do not replace this with table drops or a destructive reset. Test a new database and a historical fixture, including notes, links, connection settings, audit rows and triggers. Verify migration files are included when packaging.

## Distribution

An unsigned unpacked app can be inspected locally with `npx electron-builder --mac --dir`. Signing, notarization and release publication require separate maintainer decisions. Do not treat a local package as a released artifact.

See [SECURITY.md](SECURITY.md) for vulnerability reports and [dependency notes](docs/DEPENDENCIES.md) for known maintenance limitations.
