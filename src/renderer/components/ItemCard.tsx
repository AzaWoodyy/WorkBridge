import { SourceBadge } from '@renderer/components/SourceBadge'
import { StatusChip } from '@renderer/components/StatusChip'
import { PlanningChip } from '@renderer/components/PlanningChip'
import { cn } from '@renderer/lib/utils'
import type { PlannerLane, WorkItem } from '@renderer/data/types'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkEmoji from 'remark-emoji'

export function ItemCard({
  item,
  lane,
  linkedCount,
  onSelect
}: {
  item: WorkItem
  lane?: PlannerLane
  linkedCount?: number
  onSelect?: (id: string) => void
}) {
  const dueText = item.dueAt ? new Date(item.dueAt).toLocaleDateString() : null
  const dueDate = item.dueAt ? new Date(item.dueAt) : null
  const now = new Date()
  const isDueToday =
    dueDate &&
    dueDate.getFullYear() === now.getFullYear() &&
    dueDate.getMonth() === now.getMonth() &&
    dueDate.getDate() === now.getDate()
  const isOverdue = dueDate ? dueDate.getTime() < now.getTime() && !isDueToday : false
  const titleText = item.title.replace(/\s*\n\s*/g, ' ')
  const updatedDate = item.updatedAt ? new Date(item.updatedAt) : null
  const updatedText =
    updatedDate && !Number.isNaN(updatedDate.getTime()) ? updatedDate.toLocaleString() : '—'
  const isApproved = item.source === 'gitlab' && Boolean(item.meta?.approvals?.approved)

  return (
    <button
      className={cn(
        'flex w-full flex-col gap-3 rounded-lg border border-border/50 bg-card/60 px-3 py-3 text-left transition hover:border-border/70 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40'
      )}
      onClick={() => onSelect?.(item.id)}
    >
      <div className="flex items-start justify-between gap-4 min-w-0">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <SourceBadge source={item.source} />
            <StatusChip status={item.status} />
            {isApproved ? (
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                Approved
              </span>
            ) : null}
            {lane ? <PlanningChip lane={lane} /> : null}
          </div>
          <h3 className="text-base font-semibold leading-snug text-foreground line-clamp-2" title={item.title}>
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
          </h3>
        </div>
        <div className="text-xs text-muted-foreground shrink-0">{item.needsReview ? 'Review request' : 'Active work'}</div>
      </div>
      <div className="markdown line-clamp-5 text-sm text-muted-foreground break-words">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkEmoji]}
          components={{
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
          {item.snippet}
        </ReactMarkdown>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <span className="min-w-0 truncate" title={item.projectOrRoom}>{item.projectOrRoom}</span>
        <div className="flex flex-wrap items-center gap-3">
          {typeof linkedCount === 'number' ? <span>{linkedCount} linked</span> : null}
          {dueText ? (
            <span className={isOverdue ? 'text-rose-600 dark:text-rose-300' : isDueToday ? 'text-amber-600 dark:text-amber-300' : ''}>
              {isOverdue ? 'Overdue' : isDueToday ? 'Due today' : `Due ${dueText}`}
            </span>
          ) : null}
          <span>Updated {updatedText}</span>
        </div>
      </div>
    </button>
  )
}
