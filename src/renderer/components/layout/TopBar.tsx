import { DotFilledIcon, MagnifyingGlassIcon, MoonIcon, SunIcon } from '@radix-ui/react-icons'
import { useAppStore } from '@renderer/store/appStore'
import { Button } from '@renderer/components/ui/button'
import { useSyncStatus, useTriggerSyncMutation } from '@renderer/data/useDbData'
import { cn } from '@renderer/lib/utils'

export function TopBar() {
  const theme = useAppStore((state) => state.theme)
  const setTheme = useAppStore((state) => state.setTheme)
  const setCommandOpen = useAppStore((state) => state.setCommandOpen)
  const { data: syncStatus } = useSyncStatus()
  const triggerSync = useTriggerSyncMutation()

  const themes: Array<'light' | 'dark' | 'oled'> = ['light', 'dark', 'oled']
  const nextTheme = themes[(themes.indexOf(theme as any) + 1) % themes.length] ?? 'light'
  const gitlabStatus = syncStatus?.find((entry) => entry.source === 'gitlab')
  const clickupStatus = syncStatus?.find((entry) => entry.source === 'clickup')
  const rocketStatus = syncStatus?.find((entry) => entry.source === 'rocketchat')

  return (
    <header className="flex items-center justify-between gap-4 border-b border-border/70 bg-background px-6 py-4">
      <button
        className="flex w-full max-w-xl items-center gap-3 rounded-xl border border-border/70 bg-card px-4 py-2 text-left shadow-sm transition hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 min-w-0"
        onClick={() => setCommandOpen(true)}
      >
        <MagnifyingGlassIcon className="h-4 w-4 text-muted-foreground" />
        <div className="flex-1 min-w-0 text-sm text-muted-foreground truncate">
          Search tasks, MRs, messages...
        </div>
        <div className="rounded-md border border-border/70 px-2 py-1 text-xs text-muted-foreground">Cmd + K</div>
      </button>

      <div className="flex items-center gap-4">
        <div className="rounded-xl border border-border/60 bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <span>Sync:</span>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[11px] font-medium',
                gitlabStatus?.status === 'syncing'
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                  : gitlabStatus?.status === 'error'
                  ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                  : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
              )}
            >
              GitLab {gitlabStatus?.status ?? 'idle'}
            </span>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[11px] font-medium',
                clickupStatus?.status === 'syncing'
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                  : clickupStatus?.status === 'error'
                  ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                  : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
              )}
            >
              ClickUp {clickupStatus?.status ?? 'idle'}
            </span>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[11px] font-medium',
                rocketStatus?.status === 'syncing'
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                  : rocketStatus?.status === 'error'
                  ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                  : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
              )}
            >
              Rocket.Chat {rocketStatus?.status ?? 'idle'}
            </span>
            {gitlabStatus?.lastError ? (
              <span className="text-rose-500">• {gitlabStatus.lastError}</span>
            ) : gitlabStatus?.lastSyncAt ? (
              <span>• {new Date(gitlabStatus.lastSyncAt).toLocaleTimeString()}</span>
            ) : (
              <span>• not synced</span>
            )}
            {clickupStatus?.lastError ? (
              <span className="text-rose-500">• {clickupStatus.lastError}</span>
            ) : null}
            {rocketStatus?.lastError ? (
              <span className="text-rose-500">• {rocketStatus.lastError}</span>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                triggerSync.mutate('gitlab')
                triggerSync.mutate('clickup')
                triggerSync.mutate('rocketchat')
              }}
              className="h-7 px-2 text-[11px]"
            >
              Sync now
            </Button>
          </div>
        </div>
        <Button variant="outline" size="icon" onClick={() => setTheme(nextTheme)} aria-label="Toggle theme">
          {theme === 'dark' ? <SunIcon /> : theme === 'oled' ? <DotFilledIcon /> : <MoonIcon />}
        </Button>
      </div>
    </header>
  )
}
