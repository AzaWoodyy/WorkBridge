export function extractClickUpIds(text: string): string[] {
  const ids = new Set<string>()
  const urlRegex = /https?:\/\/app\.clickup\.com\/t\/([a-z0-9]+)/gi
  const idRegex = /\bCU-([a-z0-9]+)\b/gi

  let match
  while ((match = urlRegex.exec(text))) {
    ids.add(match[1])
  }
  while ((match = idRegex.exec(text))) {
    ids.add(match[1])
  }
  return Array.from(ids)
}

export function normalizeMergeRequest(mr: {
  draft?: boolean
  work_in_progress?: boolean
  title: string
  reviewers?: { name?: string; username: string }[]
  assignees?: { name?: string; username: string }[]
}) {
  return {
    isDraft: Boolean(mr.draft ?? mr.work_in_progress ?? mr.title.startsWith('Draft:')),
    reviewers: mr.reviewers?.map((user) => user.name ?? user.username).filter(Boolean) ?? [],
    assignees: mr.assignees?.map((user) => user.name ?? user.username).filter(Boolean) ?? []
  }
}
