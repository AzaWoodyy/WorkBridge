# Security

## Reporting

Please avoid public issues containing tokens, private URLs, account data or a working exploit. Use [GitHub private vulnerability reporting](https://github.com/AzaWoodyy/WorkBridge/security/advisories/new) if it is enabled. If that route is unavailable, open a minimal issue requesting a private reporting channel without disclosing the vulnerability. No response-time guarantee is offered for this personal project.

Include the affected commit/version, operating system, reproducible steps with fictional data, impact and any proposed mitigation. The current default branch is the maintenance target; older releases do not have a guaranteed patch policy.

## Data and trust boundaries

- Tokens use the OS credential store through Keytar. Never embed a token in a URL, screenshot or bug report.
- SQLite stores cached remote content, connection scopes, links, personal notes and deletion audit records in the Electron user-data profile. It is **not encrypted**. OS account protection and disk encryption remain relevant.
- Renderer Node integration is disabled; context isolation and sandboxing are enabled. The preload exposes specific operations, and the main process validates IPC arguments with Zod.
- External navigation is limited to HTTP(S). A Content Security Policy restricts scripts, frames and connections. These controls do not make untrusted integration data inherently safe.
- Integration actions can change remote state. Grant tokens only the permissions needed for the features you use.
- Demo mode uses a fresh temporary profile, fictional fixtures, no Keychain access and no remote synchronization or mutations. Do not use real account information in a demo profile.

“Reset local data” removes cached work, planning state, links, connection settings and stored tokens. Deletion audit records are retained. It is not a secure-erasure procedure for the database, backups or OS storage.

## Dependencies and distribution

See [DEPENDENCIES.md](docs/DEPENDENCIES.md). Keytar remains a maintenance concern, and development-tool transitive advisories require review before distributing builds. CI verifies compilation and logic, not signed distribution, live credentials or all desktop platforms. Only download builds from a source you trust.

## Historical configuration identifiers

Earlier commits contained two ClickUp configuration UUIDs: a custom-field identifier and a dropdown-option identifier. They are not authentication tokens. Current defaults no longer contain them. The supplied historical audit reported no secrets, internal hostnames or employer-specific material; that is a bounded review, not a guarantee about every future contribution.

A history purge is optional and would need a separate maintainer decision. [The history-cleanup note](docs/HISTORY-CLEANUP.md) describes the considerations without reproducing those identifiers. No history cleanup is performed by this change.
