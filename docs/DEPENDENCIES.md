# Dependency upgrade notes

Validated on 2026-11-11 against npm registry metadata (`npm view <package> version engines peerDependencies`) and the official [Electron release table](https://releases.electronjs.org/), [Vite guide](https://vite.dev/guide/), and [Tailwind upgrade guide](https://tailwindcss.com/docs/upgrade-guide).

- Electron 45.3.0; React/React DOM 19.3.1; electron-vite 6.0.0; Vite 8.3.8; Tailwind 4.3.5.
- Vitest 5.1.0, better-sqlite3 13.0.3, electron-builder 26.18.0. Node 22.12+ required; local verification uses Node 22.23.4.
- Zod upgraded to v4 to remove the production advisory reported against v3.
- Tailwind uses CSS theme tokens and the v4 PostCSS plugin. The former TS theme is removed; dark mode remains class based.
- SQLite must be rebuilt for the runtime executing it. `npm run test:prepare` targets Node; `npm run postinstall` targets Electron. Run the appropriate command when switching.
- Keytar remains at 7.9.0 (latest available); its maintenance status is a known limitation. Replacing the credentials backend requires a deliberate migration preserving existing Keychain entries.
- Development-tool transitive advisories remain (npm audit reported 19 moderate after the upgrade). No blanket `npm audit fix --force` was applied. Review them before release; local build success does not establish security of the toolchain.
