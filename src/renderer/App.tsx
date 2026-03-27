import { useEffect } from 'react'
import { CommandPalette } from '@renderer/components/CommandPalette'
import { DetailDrawer } from '@renderer/components/layout/DetailDrawer'
import { Sidebar } from '@renderer/components/layout/Sidebar'
import { TopBar } from '@renderer/components/layout/TopBar'
import { Dashboard } from '@renderer/screens/Dashboard'
import { Inbox } from '@renderer/screens/Inbox'
import { Planner } from '@renderer/screens/Planner'
import { Settings } from '@renderer/screens/Settings'
import { useAppStore } from '@renderer/store/appStore'
import { usePlannerMutation, useTriggerSyncMutation } from '@renderer/data/useDbData'

export function App() {
  const activeView = useAppStore((state) => state.activeView)
  const drawerOpen = useAppStore((state) => state.drawerOpen)
  const selectedItemId = useAppStore((state) => state.selectedItemId)
  const closeDrawer = useAppStore((state) => state.closeDrawer)
  const setCommandOpen = useAppStore((state) => state.setCommandOpen)
  const setLinkModalOpen = useAppStore((state) => state.setLinkModalOpen)
  const openDrawer = useAppStore((state) => state.openDrawer)
  const plannerMutation = usePlannerMutation()
  const triggerSync = useTriggerSyncMutation()

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const isInput =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.getAttribute('contenteditable') === 'true'
      if (isInput) return

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setCommandOpen(true)
        return
      }

      if ((event.metaKey || event.ctrlKey) && event.altKey && event.key.toLowerCase() === 'i') {
        event.preventDefault()
        window.workbridge.openDevTools()
        return
      }

      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'r') {
        event.preventDefault()
        triggerSync.mutate('gitlab')
        triggerSync.mutate('clickup')
        triggerSync.mutate('rocketchat')
        return
      }

      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'l') {
        event.preventDefault()
        if (selectedItemId) {
          openDrawer(selectedItemId)
          setLinkModalOpen(true)
        }
        return
      }

      if ((event.metaKey || event.ctrlKey) && event.altKey) {
        const laneMap: Record<string, string> = {
          Digit1: 'inbox',
          Digit2: 'today',
          Digit3: 'this_week',
          Digit4: 'later',
          Digit5: 'waiting',
          Digit6: 'done'
        }
        const lane = laneMap[event.code]
        if (lane && selectedItemId) {
          event.preventDefault()
          plannerMutation.mutate({ itemId: selectedItemId, lane })
        }
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setCommandOpen, selectedItemId, plannerMutation, triggerSync, setLinkModalOpen, openDrawer])

  return (
    <div className="h-full overflow-hidden bg-background text-foreground">
      <div className="grid h-full grid-cols-[200px_minmax(0,1fr)] overflow-hidden lg:grid-cols-[220px_minmax(0,1fr)_320px] xl:grid-cols-[240px_minmax(0,1fr)_360px]">
        <Sidebar />
        <main className="flex h-full min-h-0 flex-col bg-background">
          <TopBar />
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6 md:px-8 md:py-8">
            {activeView === 'dashboard' ? <Dashboard /> : null}
            {activeView === 'inbox' ? <Inbox /> : null}
            {activeView === 'planner' ? <Planner /> : null}
            {activeView === 'settings' ? <Settings /> : null}
          </div>
        </main>
        <DetailDrawer open={drawerOpen} itemId={selectedItemId} onClose={closeDrawer} />
      </div>
      <CommandPalette />
    </div>
  )
}
