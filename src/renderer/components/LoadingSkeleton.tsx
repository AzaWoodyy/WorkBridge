import { cn } from '@renderer/lib/utils'

export function LoadingSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('w-full animate-pulse rounded-xl border border-border/50 bg-muted/40 p-4', className)}>
      <div className="h-3 w-1/3 rounded bg-muted-foreground/20" />
      <div className="mt-3 h-4 w-3/4 rounded bg-muted-foreground/20" />
      <div className="mt-2 h-4 w-2/3 rounded bg-muted-foreground/20" />
      <div className="mt-4 h-3 w-1/4 rounded bg-muted-foreground/20" />
    </div>
  )
}
