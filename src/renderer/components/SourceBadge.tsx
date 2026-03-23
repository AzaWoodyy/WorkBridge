import type { Source } from '@renderer/data/types'
import { cn } from '@renderer/lib/utils'

const sourceDot: Record<Source, string> = {
  gitlab: 'bg-amber-500',
  clickup: 'bg-pink-500',
  rocketchat: 'bg-sky-500'
}

const sourceLabels: Record<Source, string> = {
  gitlab: 'GitLab',
  clickup: 'ClickUp',
  rocketchat: 'Rocket.Chat'
}

export function SourceBadge({ source }: { source: Source }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-2.5 py-0.5 text-xs text-secondary">
      <span className={cn('h-1.5 w-1.5 rounded-full', sourceDot[source])} />
      {sourceLabels[source]}
    </span>
  )
}
