import { cn } from '@renderer/lib/utils'

export function EmptyState({ title, description, className }: { title: string; description: string; className?: string }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 bg-muted/30 p-10 text-center',
        className
      )}
    >
      <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Empty</div>
      <div className="mt-2 text-lg font-semibold text-foreground">{title}</div>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
