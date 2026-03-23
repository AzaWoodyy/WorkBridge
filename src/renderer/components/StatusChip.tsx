import { cn } from '@renderer/lib/utils'

const statusStyles: Record<string, string> = {
  Open: 'text-[hsl(var(--info))]',
  Approved: 'text-[hsl(var(--success))]',
  'In Progress': 'text-[hsl(var(--warning))]',
  Backlog: 'text-secondary',
  Unread: 'text-[hsl(var(--info))]'
}

export function StatusChip({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex max-w-[220px] items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-2.5 py-0.5 text-xs text-secondary truncate',
        statusStyles[status] ?? 'text-secondary'
      )}
      title={status}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full bg-current')} />
      {status}
    </span>
  )
}
