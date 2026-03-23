import { useAppStore, type ViewKey } from '@renderer/store/appStore'
import { cn } from '@renderer/lib/utils'
import { useConnections } from '@renderer/data/useDbData'

const navItems: { key: ViewKey; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'inbox', label: 'Inbox' },
  { key: 'planner', label: 'Planner' },
  { key: 'settings', label: 'Settings' }
]

export function Sidebar() {
  const activeView = useAppStore((state) => state.activeView)
  const setActiveView = useAppStore((state) => state.setActiveView)
  const { data: connections } = useConnections()
  const hasConnections = connections?.some((conn) => conn.enabled) ?? false

  return (
    <aside className="flex h-full w-60 flex-col border-r border-border/70 bg-card/70 p-6">
      <div className="text-lg font-semibold tracking-tight">WorkBridge</div>
      <div className="mt-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">From Enzo Neault</div>

      <nav className="mt-10 flex flex-1 flex-col gap-2">
        {navItems.map((item) => (
          <button
            key={item.key}
            onClick={() => setActiveView(item.key)}
            className={cn(
              'flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition',
              activeView === item.key
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
            )}
          >
            {item.label}
            {activeView === item.key ? <span className="text-xs">●</span> : null}
          </button>
        ))}
      </nav>

      <div className="rounded-xl border border-border/70 bg-background/60 p-3 text-xs text-muted-foreground">
        {hasConnections ? 'Connected sources are syncing.' : 'No connections yet. Add one to start syncing.'}
      </div>
    </aside>
  )
}
