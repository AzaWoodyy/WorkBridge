import { cn } from '@renderer/lib/utils'
import type { PlannerLane } from '@renderer/data/types'

const laneLabels: Record<PlannerLane, string> = {
  inbox: 'Inbox',
  today: 'Today',
  this_week: 'This week',
  later: 'Later',
  waiting: 'Waiting',
  done: 'Done'
}

const laneStyles: Record<PlannerLane, string> = {
  inbox: 'border-border/60 text-secondary',
  today: 'border-[hsl(var(--accent))] text-[hsl(var(--accent))]',
  this_week: 'border-border/60 text-secondary',
  later: 'border-border/60 text-secondary',
  waiting: 'border-[hsl(var(--warning))] text-[hsl(var(--warning))]',
  done: 'border-[hsl(var(--success))] text-[hsl(var(--success))]'
}

export function PlanningChip({ lane }: { lane: PlannerLane }) {
  return (
    <span
      className={cn(
        'whitespace-nowrap rounded-full border bg-muted/30 px-2.5 py-0.5 text-xs font-medium',
        laneStyles[lane]
      )}
    >
      {laneLabels[lane]}
    </span>
  )
}
