import { useEffect, useMemo, useState } from 'react'
import * as joypixels from 'emoji-toolkit'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkEmoji from 'remark-emoji'
import {
  useItems,
  useLinks,
  usePlanner,
  usePlannerMutation,
  useGitLabApproveMutation,
  useGitLabLabelsMutation,
  useGitLabNoteMutation,
  useGitLabReviewersMutation,
  useGitLabUnapproveMutation,
  useClickUpCommentMutation,
  useRocketChatReplyMutation,
  useRocketChatReactMutation,
  useCreateLinkMutation,
  useConfirmLinkMutation
} from '@renderer/data/useDbData'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@renderer/components/ui/dialog'
import type { Link } from '@renderer/data/types'
import type { PlannerLane } from '@renderer/data/types'
import { SourceBadge } from '@renderer/components/SourceBadge'
import { StatusChip } from '@renderer/components/StatusChip'
import { Button } from '@renderer/components/ui/button'
import { cn } from '@renderer/lib/utils'
import { useAppStore } from '@renderer/store/appStore'

const lanes: { key: PlannerLane; label: string }[] = [
  { key: 'inbox', label: 'Inbox' },
  { key: 'today', label: 'Today' },
  { key: 'this_week', label: 'This week' },
  { key: 'later', label: 'Later' },
  { key: 'waiting', label: 'Waiting' },
  { key: 'done', label: 'Done' }
]

export function DetailDrawer({ open, itemId, onClose }: { open: boolean; itemId?: string; onClose: () => void }) {
  const { data: items } = useItems()
  const { data: planner } = usePlanner()
  const { data: links } = useLinks()
  const plannerMutation = usePlannerMutation()
  const gitlabNoteMutation = useGitLabNoteMutation()
  const gitlabLabelsMutation = useGitLabLabelsMutation()
  const gitlabReviewersMutation = useGitLabReviewersMutation()
  const gitlabApproveMutation = useGitLabApproveMutation()
  const gitlabUnapproveMutation = useGitLabUnapproveMutation()
  const clickupCommentMutation = useClickUpCommentMutation()
  const rocketReplyMutation = useRocketChatReplyMutation()
  const rocketReactMutation = useRocketChatReactMutation()
  const createLinkMutation = useCreateLinkMutation()
  const confirmLinkMutation = useConfirmLinkMutation()

  const item = items?.find((entry) => entry.id === itemId)
  const plannerEntry = planner?.find((entry) => entry.itemId === itemId)
  const [note, setNote] = useState('')
  const [mrComment, setMrComment] = useState('')
  const [mrLabels, setMrLabels] = useState('')
  const [mrAssignees, setMrAssignees] = useState('')
  const [mrReviewers, setMrReviewers] = useState('')
  const [clickupComment, setClickupComment] = useState('')
  const [rocketReply, setRocketReply] = useState('')
  const [rocketEmoji, setRocketEmoji] = useState('')

  const rocketQuickReactions = [':eyes:', ':ping_pong:', ':white_check_mark:', ':hourglass:']
  const displayRocketEmoji = (value: string) => {
    if (!value) return value
    const normalized = value.startsWith(':') ? value : value.length > 2 ? `:${value.replace(/:/g, '')}:` : value
    const converted = joypixels.shortnameToUnicode(normalized)
    return converted || value
  }
  const normalizeRocketEmoji = (value: string) => {
    if (!value) return value
    if (value.startsWith(':') && value.endsWith(':')) return value
    const short = joypixels.toShort(value)
    const match = short.match(/:[a-z0-9_+-]+:/i)
    if (match) return match[0]
    if (value.startsWith(':')) return value
    if (value.length > 2) return `:${value.replace(/:/g, '')}:`
    return value
  }
  const linkOpen = useAppStore((state) => state.linkModalOpen)
  const setLinkOpen = useAppStore((state) => state.setLinkModalOpen)
  const [linkSearch, setLinkSearch] = useState('')
  const [linkRelation, setLinkRelation] = useState('relates_to')
  const [linkTargetId, setLinkTargetId] = useState<string | null>(null)

  useEffect(() => {
    setNote(plannerEntry?.personalNote ?? '')
  }, [plannerEntry?.personalNote])

  useEffect(() => {
    if (!item) return
    const metaLabels = (item.meta?.labels ?? []) as string[]
    const metaAssignees = (item.meta?.assignees ?? []) as string[]
    const metaReviewers = (item.meta?.reviewers ?? []) as string[]
    setMrLabels(metaLabels.join(', '))
    setMrAssignees(metaAssignees.join(', '))
    setMrReviewers(metaReviewers.join(', '))
  }, [item])


  const relatedLinks = useMemo(() => {
    if (!item || !links) return []
    return links.filter((link) => link.fromItemId === item.id || link.toItemId === item.id) as Link[]
  }, [item, links])

  const relatedItems = useMemo(() => {
    if (!item || !links || !items) return []
    const relatedIds = relatedLinks.map((link) => (link.fromItemId === item.id ? link.toItemId : link.fromItemId))
    return items.filter((entry) => relatedIds.includes(entry.id))
  }, [item, links, items, relatedLinks])

  const relatedMessages = useMemo(
    () => relatedItems.filter((entry) => entry.source === 'rocketchat'),
    [relatedItems]
  )

  const linkCandidates = useMemo(() => {
    if (!item || !items) return []
    return items
      .filter((entry) => entry.id !== item.id)
      .filter((entry) => (item.source === 'gitlab' ? entry.source === 'clickup' : entry.source === 'gitlab'))
      .filter((entry) => entry.title.toLowerCase().includes(linkSearch.toLowerCase()))
  }, [item, items, linkSearch])

  if (!open || !item) {
    return (
      <aside
        className={cn(
          'fixed inset-y-0 right-0 z-40 flex h-full w-full max-w-[440px] flex-col overflow-y-auto border-l border-border/70 bg-card/95 p-6 shadow-2xl transition-transform lg:static lg:z-auto lg:max-w-none lg:shadow-none',
          open ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        )}
      >
        <div className="text-sm font-semibold text-foreground">Detail drawer</div>
        <div className="mt-2 text-sm text-muted-foreground">
          Select any item to see its links, notes, and local planning state.
        </div>
        <div className="mt-6 rounded-xl border border-dashed border-border/60 bg-muted/40 p-4 text-xs text-muted-foreground">
          Select an item to view details, links, and local planning state.
        </div>
      </aside>
    )
  }

  const meta = item?.meta ?? {}
  const titleText = item.title.replace(/\s*\n\s*/g, ' ')

  return (
    <aside
      className={cn(
        'fixed inset-y-0 right-0 z-40 flex h-full w-full max-w-[440px] flex-col overflow-y-auto border-l border-border/70 bg-card/95 p-6 shadow-2xl transition-transform lg:static lg:z-auto lg:max-w-none lg:shadow-none',
        open ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
      )}
    >
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="space-y-2 min-w-0">
          <div className="flex items-center gap-2">
            <SourceBadge source={item.source} />
            <StatusChip status={item.status} />
            {item.needsReview ? (
              <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-xs font-medium text-rose-600 dark:text-rose-300">
                Needs review
              </span>
            ) : null}
          </div>
          <h2 className="text-lg font-semibold leading-snug break-words" title={item.title}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkEmoji]}
              components={{
                p: ({ children }) => <span>{children}</span>,
                a: ({ href, children }) => (
                  <a
                    href={href}
                    className="text-primary underline"
                    onClick={(event) => {
                      event.preventDefault()
                      if (href) window.workbridge.openExternal(href)
                    }}
                  >
                    {children}
                  </a>
                )
              }}
            >
              {titleText}
            </ReactMarkdown>
          </h2>
          <p className="text-sm text-muted-foreground truncate" title={item.projectOrRoom}>
            {item.projectOrRoom}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>

      <div className="mt-6 space-y-4 text-sm">
        <div className="border-b border-border/60 pb-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Summary</div>
          <div className="markdown mt-3 text-sm text-foreground">
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkEmoji]}>
              {item.snippet || 'No summary provided.'}
            </ReactMarkdown>
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            Updated{' '}
            {(() => {
              const date = item.updatedAt ? new Date(item.updatedAt) : null
              return date && !Number.isNaN(date.getTime()) ? date.toLocaleString() : '—'
            })()}
          </div>
        </div>

        {item.source === 'gitlab' ? (
          <div className="border-b border-border/60 pb-6">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">GitLab details</div>
            <div className="mt-3 grid gap-2 text-sm">
              <div className="flex items-start justify-between gap-3 min-w-0">
                <span className="text-muted-foreground">State</span>
                <span className="font-medium text-foreground text-right min-w-0 truncate" title={meta.state ?? item.status}>
                  {meta.state ?? item.status}
                </span>
              </div>
              <div className="flex items-start justify-between gap-3 min-w-0">
                <span className="text-muted-foreground">Draft</span>
                <span className="font-medium text-foreground text-right">{meta.draft ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex items-start justify-between gap-3 min-w-0">
                <span className="text-muted-foreground">Pipeline</span>
                <span className="font-medium text-foreground text-right min-w-0 truncate" title={meta.pipelineStatus ?? 'Unknown'}>
                  {meta.pipelineStatus ?? 'Unknown'}
                </span>
              </div>
              <div className="flex items-start justify-between gap-3 min-w-0">
                <span className="text-muted-foreground">Reviewers</span>
                <span
                  className="font-medium text-foreground text-right min-w-0 break-words line-clamp-2"
                  title={(meta.reviewers ?? []).join(', ') || 'None'}
                >
                  {(meta.reviewers ?? []).join(', ') || 'None'}
                </span>
              </div>
              <div className="flex items-start justify-between gap-3 min-w-0">
                <span className="text-muted-foreground">Assignees</span>
                <span
                  className="font-medium text-foreground text-right min-w-0 break-words line-clamp-2"
                  title={(meta.assignees ?? []).join(', ') || 'None'}
                >
                  {(meta.assignees ?? []).join(', ') || 'None'}
                </span>
              </div>
              <div className="flex items-start justify-between gap-3 min-w-0">
                <span className="text-muted-foreground">Approvals</span>
                <span className="font-medium text-foreground text-right min-w-0 truncate" title="Approvals">
                  {meta.approvals
                    ? `${meta.approvals.approvedBy?.length ?? 0} approved · ${meta.approvals.approvalsLeft ?? '?'} left`
                    : 'Not available'}
                </span>
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actions</div>
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">Add comment</span>
                <textarea
                  className="min-h-[80px] w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  value={mrComment}
                  onChange={(event) => setMrComment(event.target.value)}
                  placeholder="Leave a note on this MR..."
                />
              </label>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (!mrComment.trim()) return
                  gitlabNoteMutation.mutate({
                    projectId: meta.projectId,
                    iid: meta.iid,
                    body: mrComment
                  })
                  setMrComment('')
                }}
              >
                Post comment
              </Button>
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">Labels (comma separated)</span>
                <input
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  value={mrLabels}
                  onChange={(event) => setMrLabels(event.target.value)}
                />
              </label>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  gitlabLabelsMutation.mutate({
                    projectId: meta.projectId,
                    iid: meta.iid,
                    labels: mrLabels.split(',').map((entry) => entry.trim()).filter(Boolean)
                  })
                }
              >
                Update labels
              </Button>
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">Assignees (usernames)</span>
                <input
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  value={mrAssignees}
                  onChange={(event) => setMrAssignees(event.target.value)}
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">Reviewers (usernames)</span>
                <input
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  value={mrReviewers}
                  onChange={(event) => setMrReviewers(event.target.value)}
                />
              </label>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  gitlabReviewersMutation.mutate({
                    projectId: meta.projectId,
                    iid: meta.iid,
                    assignees: mrAssignees.split(',').map((entry) => entry.trim()).filter(Boolean),
                    reviewers: mrReviewers.split(',').map((entry) => entry.trim()).filter(Boolean)
                  })
                }
              >
                Update assignees & reviewers
              </Button>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    gitlabApproveMutation.mutate({ projectId: meta.projectId, iid: meta.iid })
                  }
                >
                  Approve
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    gitlabUnapproveMutation.mutate({ projectId: meta.projectId, iid: meta.iid })
                  }
                >
                  Unapprove
                </Button>
              </div>
            </div>
            {relatedMessages.length ? (
              <div className="mt-6 space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Linked messages
                </div>
                {relatedMessages.map((message) => (
                  <div key={message.id} className="rounded-lg border border-border/60 p-3 text-sm">
                    <div className="text-xs text-muted-foreground">
                      {message.meta?.author ? `@${message.meta.author}` : 'Rocket.Chat'} •{' '}
                      {message.projectOrRoom}
                    </div>
                    <div className="mt-2 text-sm text-foreground break-words line-clamp-3" title={message.snippet}>
                      {message.snippet}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {item.source === 'clickup' ? (
          <div className="border-b border-border/60 pb-6">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">ClickUp details</div>
            <div className="mt-3 grid gap-2 text-sm">
              <div className="flex items-start justify-between gap-3 min-w-0">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium text-foreground text-right min-w-0 truncate" title={meta.status ?? item.status}>
                  {meta.status ?? item.status}
                </span>
              </div>
              <div className="flex items-start justify-between gap-3 min-w-0">
                <span className="text-muted-foreground">Priority</span>
                <span className="font-medium text-foreground text-right min-w-0 truncate" title={meta.priority ?? 'None'}>
                  {meta.priority ?? 'None'}
                </span>
              </div>
              <div className="flex items-start justify-between gap-3 min-w-0">
                <span className="text-muted-foreground">Assignees</span>
                <span
                  className="font-medium text-foreground text-right min-w-0 break-words line-clamp-2"
                  title={(meta.assignees ?? []).join(', ') || 'Unassigned'}
                >
                  {(meta.assignees ?? []).join(', ') || 'Unassigned'}
                </span>
              </div>
              <div className="flex items-start justify-between gap-3 min-w-0">
                <span className="text-muted-foreground">List</span>
                <span className="font-medium text-foreground text-right min-w-0 truncate" title={meta.listName ?? 'Unknown'}>
                  {meta.listName ?? 'Unknown'}
                </span>
              </div>
              <div className="flex items-start justify-between gap-3 min-w-0">
                <span className="text-muted-foreground">Folder</span>
                <span className="font-medium text-foreground text-right min-w-0 truncate" title={meta.folderName ?? '—'}>
                  {meta.folderName ?? '—'}
                </span>
              </div>
              <div className="flex items-start justify-between gap-3 min-w-0">
                <span className="text-muted-foreground">Space</span>
                <span className="font-medium text-foreground text-right min-w-0 truncate" title={meta.spaceName ?? '—'}>
                  {meta.spaceName ?? '—'}
                </span>
              </div>
              <div className="flex items-start justify-between gap-3 min-w-0">
                <span className="text-muted-foreground">Equipe</span>
                <span className="font-medium text-foreground text-right min-w-0 truncate" title={meta.equipe ?? '—'}>
                  {meta.equipe ?? '—'}
                </span>
              </div>
              {item.dueAt ? (
                <div className="flex items-start justify-between gap-3 min-w-0">
                  <span className="text-muted-foreground">Due</span>
                  <span className="font-medium text-foreground text-right min-w-0 truncate" title={new Date(item.dueAt).toLocaleString()}>
                    {new Date(item.dueAt).toLocaleString()}
                  </span>
                </div>
              ) : null}
            </div>
            <div className="mt-5 grid gap-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actions</div>
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">Add comment</span>
                <textarea
                  className="min-h-[80px] w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  value={clickupComment}
                  onChange={(event) => setClickupComment(event.target.value)}
                  placeholder="Leave a comment on this task..."
                />
              </label>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (!clickupComment.trim()) return
                  const taskId = item.id.replace('cu-task-', '')
                  clickupCommentMutation.mutate({ taskId, body: clickupComment })
                  setClickupComment('')
                }}
              >
                Post comment
              </Button>
            </div>
          </div>
        ) : null}

        {item.source === 'rocketchat' ? (
          <div className="border-b border-border/60 pb-6">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rocket.Chat details</div>
            <div className="mt-3 grid gap-2 text-sm">
              <div className="flex items-start justify-between gap-3 min-w-0">
                <span className="text-muted-foreground">Room</span>
                <span className="font-medium text-foreground text-right min-w-0 truncate" title={item.projectOrRoom}>
                  {item.projectOrRoom}
                </span>
              </div>
              <div className="flex items-start justify-between gap-3 min-w-0">
                <span className="text-muted-foreground">Author</span>
                <span className="font-medium text-foreground text-right min-w-0 truncate" title={meta.author ?? 'Unknown'}>
                  {meta.author ?? 'Unknown'}
                </span>
              </div>
              <div className="flex items-start justify-between gap-3 min-w-0">
                <span className="text-muted-foreground">Review request</span>
                <span className="font-medium text-foreground text-right">{meta.reviewRequest ? 'Yes' : 'No'}</span>
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actions</div>
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">Reply in thread</span>
                <textarea
                  className="min-h-[80px] w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  value={rocketReply}
                  onChange={(event) => setRocketReply(event.target.value)}
                  placeholder="Write a threaded reply..."
                />
              </label>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (!rocketReply.trim()) return
                  const messageId = item.id.replace('rc-msg-', '')
                  const roomId = meta.roomId
                  if (!roomId) return
                  rocketReplyMutation.mutate({ roomId, threadId: messageId, body: rocketReply })
                  setRocketReply('')
                }}
              >
                Post reply
              </Button>
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quick reactions</div>
                <div className="flex flex-wrap gap-2">
                  {rocketQuickReactions.map((emoji) => (
                    <button
                      key={emoji}
                      className="rounded-full border border-border/70 bg-muted/30 px-3 py-1 text-lg transition hover:bg-muted"
                      onClick={() => {
                        const messageId = item.id.replace('rc-msg-', '')
                        rocketReactMutation.mutate({ messageId, emoji, shouldReact: true })
                      }}
                    >
                      {displayRocketEmoji(emoji)}
                    </button>
                  ))}
                </div>
                <label className="space-y-1">
                  <span className="text-xs text-muted-foreground">Custom reaction</span>
                  <div className="flex items-center gap-2">
                    <input
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      value={rocketEmoji}
                      onChange={(event) => setRocketEmoji(event.target.value)}
                      placeholder=":eyes: or 👀"
                    />
                    <span className="text-lg">
                      {rocketEmoji ? displayRocketEmoji(normalizeRocketEmoji(rocketEmoji)) : '✨'}
                    </span>
                  </div>
                </label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!rocketEmoji.trim()) return
                    const messageId = item.id.replace('rc-msg-', '')
                    const normalized = normalizeRocketEmoji(rocketEmoji)
                    rocketReactMutation.mutate({ messageId, emoji: normalized, shouldReact: true })
                    setRocketEmoji('')
                  }}
                >
                  Add reaction
                </Button>
              </div>
              {meta.reactions ? (
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Reactions
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(meta.reactions as Record<string, { count?: number; usernames?: string[] }>).map(
                      ([emoji, data]) => (
                        <div key={emoji} className="flex items-center gap-2 rounded-full border border-border/60 px-3 py-1 text-sm">
                          <span>{displayRocketEmoji(emoji)}</span>
                          <span className="text-xs text-muted-foreground">{data?.count ?? 1}</span>
                          {data?.usernames?.length ? (
                            <span className="text-[11px] text-muted-foreground">
                              {data.usernames.join(', ')}
                            </span>
                          ) : null}
                          <button
                            className="text-[11px] text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              const messageId = item.id.replace('rc-msg-', '')
                              rocketReactMutation.mutate({ messageId, emoji, shouldReact: false })
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      )
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="border-b border-border/60 pb-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Planning</div>
          {plannerEntry ? (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Lane</span>
                <span className="font-medium text-foreground">{plannerEntry.lane.replace('_', ' ')}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Priority</span>
                <span className="font-medium text-foreground">{plannerEntry.priority}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Pinned</span>
                <span className="font-medium text-foreground">{plannerEntry.pinned ? 'Yes' : 'No'}</span>
              </div>
              {plannerEntry.personalNote ? (
                <div className="text-xs text-muted-foreground">Note: {plannerEntry.personalNote}</div>
              ) : null}
            </div>
          ) : (
            <div className="mt-3 text-sm text-muted-foreground">No planner state yet.</div>
          )}
        </div>

        <div className="border-b border-border/60 pb-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Update planning</div>
          <div className="mt-3 grid gap-3 text-sm">
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Lane</span>
              <select
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={plannerEntry?.lane ?? 'inbox'}
                onChange={(event) =>
                  plannerMutation.mutate({ itemId: item.id, lane: event.target.value })
                }
              >
                {lanes.map((lane) => (
                  <option key={lane.key} value={lane.key}>
                    {lane.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Priority</span>
              <select
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={plannerEntry?.priority ?? 'P3'}
                onChange={(event) =>
                  plannerMutation.mutate({ itemId: item.id, priority: event.target.value })
                }
              >
                {['P1', 'P2', 'P3', 'P4'].map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
              <div>
                <div className="text-sm font-medium text-foreground">Pinned</div>
                <div className="text-xs text-muted-foreground">Keep this at the top of its lane.</div>
              </div>
              <Button
                variant={plannerEntry?.pinned ? 'secondary' : 'outline'}
                size="sm"
                onClick={() =>
                  plannerMutation.mutate({ itemId: item.id, pinned: !(plannerEntry?.pinned ?? false) })
                }
              >
                {plannerEntry?.pinned ? 'Pinned' : 'Pin'}
              </Button>
            </div>
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Personal note</span>
              <textarea
                className="min-h-[90px] w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Add a note for yourself..."
              />
            </label>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => plannerMutation.mutate({ itemId: item.id, personalNote: note })}
            >
              Save note
            </Button>
          </div>
        </div>

        <div className="border-b border-border/60 pb-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Related items</div>
          <div className="mt-3 space-y-3">
            {relatedItems.length === 0 ? (
              <div className="text-sm text-muted-foreground">No linked items yet.</div>
            ) : (
              relatedItems.map((related) => {
                const link = relatedLinks.find(
                  (entry) =>
                    (entry.fromItemId === item.id && entry.toItemId === related.id) ||
                    (entry.toItemId === item.id && entry.fromItemId === related.id)
                )
                return (
                <div key={related.id} className="rounded-lg border border-border/60 p-3 min-w-0">
                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                    <SourceBadge source={related.source} />
                    <span className="text-xs text-muted-foreground min-w-0 truncate" title={related.projectOrRoom}>
                      {related.projectOrRoom}
                    </span>
                    {link?.suggested ? (
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] text-amber-700 dark:text-amber-300">
                        Suggested
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] text-emerald-700 dark:text-emerald-300">
                        Confirmed
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-sm font-medium text-foreground line-clamp-2" title={related.title}>
                    {related.title}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{link?.relationType?.replace('_', ' ')}</span>
                    {link?.suggested ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-7 px-2 text-[11px]"
                        onClick={() => confirmLinkMutation.mutate(link.id)}
                      >
                        Confirm
                      </Button>
                    ) : null}
                  </div>
                </div>
              )})
            )}
          </div>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setLinkOpen(true)}>
            Link item
          </Button>
        </div>

        <div className="border-b border-border/60 pb-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sync status</div>
          <div className="mt-3 text-sm text-muted-foreground">
            Sync runs on your configured cadence. Use Sync now to refresh immediately.
          </div>
          <div className="mt-3 flex gap-2">
            <Button variant="secondary" size="sm">
              Retry sync
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.workbridge.openExternal(item.url)}>
              Open source link
            </Button>
          </div>
        </div>
      </div>

      <div className={cn('mt-auto pt-6 text-xs text-muted-foreground')}>
        Links and notes live locally. External sources remain system of record.
      </div>
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link an item</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-3 text-sm">
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Search</span>
              <input
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={linkSearch}
                onChange={(event) => setLinkSearch(event.target.value)}
                placeholder="Search by title"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Relation</span>
              <select
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={linkRelation}
                onChange={(event) => setLinkRelation(event.target.value)}
              >
                <option value="relates_to">Relates to</option>
                <option value="implements">Implements</option>
                <option value="references">References</option>
                <option value="review_request">Review request</option>
              </select>
            </label>
            <div className="max-h-56 space-y-2 overflow-y-auto">
              {linkCandidates.length === 0 ? (
                <div className="text-xs text-muted-foreground">No items found.</div>
              ) : (
                linkCandidates.map((candidate) => (
                  <button
                    key={candidate.id}
                    onClick={() => setLinkTargetId(candidate.id)}
                    className={cn(
                      'flex w-full items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2 text-left text-sm min-w-0',
                      linkTargetId === candidate.id && 'border-primary text-primary'
                    )}
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-foreground line-clamp-2" title={candidate.title}>
                        {candidate.title}
                      </div>
                      <div className="text-xs text-muted-foreground truncate" title={candidate.projectOrRoom}>
                        {candidate.projectOrRoom}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{candidate.source}</span>
                  </button>
                ))
              )}
            </div>
            <Button
              variant="secondary"
              size="sm"
              disabled={!linkTargetId || !item}
              onClick={() => {
                if (!item || !linkTargetId) return
                createLinkMutation.mutate({
                  fromId: item.id,
                  toId: linkTargetId,
                  relationType: linkRelation,
                  origin: 'manual',
                  suggested: false
                })
                setLinkOpen(false)
                setLinkTargetId(null)
                setLinkSearch('')
              }}
            >
              Create link
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </aside>
  )
}
