# Optional historical configuration cleanup

Two ClickUp configuration UUIDs previously appeared in Settings defaults: one custom-field ID and one dropdown-option ID. They have been removed from the current defaults. Their exact values are deliberately not repeated here.

These identifiers are not credentials. Removing them from the current tree does not remove earlier commits, existing clones, forks, caches or downloaded archives. Nothing in this change rewrites published history, changes GitHub settings or force-pushes branches.

If the maintainer later decides that historical removal is warranted:

1. Confirm the exact affected commits and files privately, and distinguish identifiers from actual secrets. Revoke any real secret before considering history cleanup; rewriting history cannot revoke access.
2. Coordinate the change with contributors and preserve an offline backup. Review the impact on tags, signatures, open PRs, commit references and forks.
3. Rehearse a targeted replacement in a disposable mirror with a history-filtering tool. Keep the replacement mapping outside the repository. Avoid deleting unrelated history.
4. Inspect all rewritten references and verify the app still builds. Obtain separate authorization before changing the remote history.
5. After any separately authorized publication, coordinate fresh clones and follow the hosting provider's process for cached views. Independent copies may still retain the original values.

No executable rewrite or force-push commands are provided here. Keeping history unchanged is a valid outcome when the exposure is limited to non-secret configuration identifiers.
