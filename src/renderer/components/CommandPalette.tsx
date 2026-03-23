import { useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkEmoji from 'remark-emoji'
import { Dialog, DialogContent } from '@renderer/components/ui/dialog'
import { useItems, usePlannerMutation, useTriggerSyncMutation } from '@renderer/data/useDbData'
import { useAppStore } from '@renderer/store/appStore'
import { cn } from '@renderer/lib/utils'

type CommandAction = {
  id: string
  label: string
  hint?: string
  shortcut?: string
  disabled?: boolean
  onSelect: () => void
}

export function CommandPalette() {
  const open = useAppStore((state) => state.commandOpen)
  const setOpen = useAppStore((state) => state.setCommandOpen)
  const setActiveView = useAppStore((state) => state.setActiveView)
  const selectedItemId = useAppStore((state) => state.selectedItemId)
  const openDrawer = useAppStore((state) => state.openDrawer)
  const drawerOpen = useAppStore((state) => state.drawerOpen)
  const setLinkModalOpen = useAppStore((state) => state.setLinkModalOpen)
  const { data: items } = useItems()
  const plannerMutation = usePlannerMutation()
  const triggerSync = useTriggerSyncMutation()

  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const close = () => setOpen(false)

  const actionBase: CommandAction[] = [
    {
      id: 'view-dashboard',
      label: 'Go to Dashboard',
      shortcut: 'G D',
      onSelect: () => {
        setActiveView('dashboard')
        close()
      }
    },
    {
      id: 'view-inbox',
      label: 'Go to Inbox',
      shortcut: 'G I',
      onSelect: () => {
        setActiveView('inbox')
        close()
      }
    },
    {
      id: 'view-planner',
      label: 'Go to Planner',
      shortcut: 'G P',
      onSelect: () => {
        setActiveView('planner')
        close()
      }
    },
    {
      id: 'view-settings',
      label: 'Go to Settings',
      shortcut: 'G S',
      onSelect: () => {
        setActiveView('settings')
        close()
      }
    },
    {
      id: 'sync-refresh',
      label: 'Refresh sync',
      shortcut: 'Cmd ⇧ R',
      onSelect: () => {
        triggerSync.mutate('gitlab')
        triggerSync.mutate('clickup')
        triggerSync.mutate('rocketchat')
        close()
      }
    }
  ]

  const laneActions: CommandAction[] = [
    { id: 'lane-inbox', label: 'Move to Inbox', shortcut: 'Cmd ⇧ 1', hint: 'Planner lane' },
    { id: 'lane-today', label: 'Move to Today', shortcut: 'Cmd ⇧ 2', hint: 'Planner lane' },
    { id: 'lane-this-week', label: 'Move to This week', shortcut: 'Cmd ⇧ 3', hint: 'Planner lane' },
    { id: 'lane-later', label: 'Move to Later', shortcut: 'Cmd ⇧ 4', hint: 'Planner lane' },
    { id: 'lane-waiting', label: 'Move to Waiting', shortcut: 'Cmd ⇧ 5', hint: 'Planner lane' },
    { id: 'lane-done', label: 'Move to Done', shortcut: 'Cmd ⇧ 6', hint: 'Planner lane' }
  ].map((action, index) => ({
    ...action,
    disabled: !selectedItemId,
    onSelect: () => {
      if (!selectedItemId) return
      const lanes = ['inbox', 'today', 'this_week', 'later', 'waiting', 'done'] as const
      plannerMutation.mutate({ itemId: selectedItemId, lane: lanes[index] })
      close()
    }
  }))

  const linkAction: CommandAction = {
    id: 'link-modal',
    label: 'Link current item',
    shortcut: 'Cmd ⇧ L',
    disabled: !selectedItemId,
    onSelect: () => {
      if (!selectedItemId) return
      if (!drawerOpen) openDrawer(selectedItemId)
      setLinkModalOpen(true)
      close()
    }
  }

  const actions = [...actionBase, linkAction, ...laneActions]

  const filteredActions = useMemo(() => {
    if (!query) return actions
    const q = query.toLowerCase()
    return actions.filter((action) => action.label.toLowerCase().includes(q))
  }, [actions, query])

  const filteredItems = useMemo(() => {
    if (!items) return []
    if (!query) return []
    const q = query.toLowerCase()
    return items.filter((item) => item.title.toLowerCase().includes(q)).slice(0, 6)
  }, [items, query])

  const entries = [
    ...filteredActions.map((action) => ({ type: 'action' as const, action })),
    ...filteredItems.map((item) => ({ type: 'item' as const, item }))
  ]

  useEffect(() => {
    if (!open) return
    setQuery('')
    setSelectedIndex(0)
    const timer = window.setTimeout(() => inputRef.current?.focus(), 50)
    return () => window.clearTimeout(timer)
  }, [open])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    if (!open) return
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, Math.max(entries.length - 1, 0)))
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        const entry = entries[selectedIndex]
        if (!entry) return
        if (entry.type === 'action') {
          if (entry.action.disabled) return
          entry.action.onSelect()
        } else {
          openDrawer(entry.item.id)
          close()
        }
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, entries, selectedIndex, openDrawer])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-xl p-0">
        <div className="border-b border-border/60 bg-card/70 px-5 py-4">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Command palette
          </div>
          <input
            ref={inputRef}
            className="mt-3 w-full rounded-lg border border-border bg-background/80 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            placeholder="Search commands or items..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="max-h-[360px] overflow-y-auto px-2 py-3">
          {entries.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
              No results. Try a different keyword.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredActions.length ? (
                <div>
                  <div className="px-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Commands
                  </div>
                  <div className="mt-2 space-y-1">
                    {filteredActions.map((action) => {
                      const index = entries.findIndex((entry) => entry.type === 'action' && entry.action.id === action.id)
                      return (
                        <button
                          key={action.id}
                          onClick={() => !action.disabled && action.onSelect()}
                          className={cn(
                            'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition',
                            index === selectedIndex ? 'bg-muted/60' : 'hover:bg-muted/30',
                            action.disabled && 'opacity-50'
                          )}
                        >
                          <div>
                            <div className="font-medium text-foreground">{action.label}</div>
                            {action.hint ? (
                              <div className="text-xs text-muted-foreground">{action.hint}</div>
                            ) : null}
                          </div>
                          {action.shortcut ? (
                            <div className="text-[11px] text-muted-foreground">{action.shortcut}</div>
                          ) : null}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : null}

              {filteredItems.length ? (
                <div>
                  <div className="px-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Items
                  </div>
                  <div className="mt-2 space-y-1">
                    {filteredItems.map((item) => {
                      const index = entries.findIndex((entry) => entry.type === 'item' && entry.item.id === item.id)
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            openDrawer(item.id)
                            close()
                          }}
                          className={cn(
                            'flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition min-w-0',
                            index === selectedIndex ? 'bg-muted/60' : 'hover:bg-muted/30'
                          )}
                        >
                          <div className="min-w-0">
                            <div className="font-medium text-foreground line-clamp-2" title={item.title}>
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
                                {item.title.replace(/\s*\n\s*/g, ' ')}
                              </ReactMarkdown>
                            </div>
                            <div className="text-xs text-muted-foreground truncate" title={item.projectOrRoom}>
                              {item.projectOrRoom}
                            </div>
                          </div>
                          <div className="text-[11px] text-muted-foreground shrink-0">{item.source}</div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
