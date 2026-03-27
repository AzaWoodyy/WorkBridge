import { ItemCard } from '@renderer/components/ItemCard'
import { EmptyState } from '@renderer/components/EmptyState'
import { useItems, useLinks, usePlanner } from '@renderer/data/useDbData'
import { useAppStore } from '@renderer/store/appStore'
import type { PlannerLane } from '@renderer/data/types'

const lanes: { key: PlannerLane; label: string; hint: string }[] = [
  { key: 'inbox', label: 'To do', hint: 'Unplanned items' },
  { key: 'today', label: 'Today', hint: 'Top focus' },
  { key: 'this_week', label: 'This week', hint: 'Planned work' },
  { key: 'later', label: 'Later', hint: 'Backlog' },
  { key: 'waiting', label: 'Waiting', hint: 'Blocked' },
  { key: 'done', label: 'Done', hint: 'Recently finished' }
]

export function Planner() {
  const { data: items } = useItems()
  const { data: planner } = usePlanner()
  const { data: links } = useLinks()
  const openDrawer = useAppStore((state) => state.openDrawer)
  const getLinkedCount = (id: string) => links?.filter((link) => link.fromItemId === id || link.toItemId === id).length ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Personal planner</h2>
          <p className="text-sm text-muted-foreground">Move items between lanes to plan your day.</p>
        </div>
        <div className="rounded-lg border border-border/60 px-3 py-2 text-xs text-muted-foreground">
          Shortcuts: Cmd ⌥ 1-6
        </div>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="grid min-w-max grid-flow-col auto-cols-[minmax(260px,320px)] gap-6">
        {lanes.map((lane) => {
          const laneItems = planner
            ?.filter((state) => state.lane === lane.key)
            .map((state) => items?.find((item) => item.id === state.itemId))
            .filter(Boolean)

          return (
            <div key={lane.key} className="flex flex-col gap-3 min-w-[260px] max-w-[320px]">
              <div className="border-b border-border/60 pb-2">
                <div className="text-sm font-semibold">{lane.label}</div>
                <div className="text-xs text-muted-foreground">{lane.hint}</div>
              </div>
              <div className="flex flex-1 flex-col">
                {laneItems && laneItems.length > 0 ? (
                  <div className="divide-y divide-border">
                    {laneItems.map((item) => (
                      <div key={item?.id} className="py-2">
                        <ItemCard
                          item={item!}
                          lane={lane.key}
                          linkedCount={getLinkedCount(item!.id)}
                          onSelect={openDrawer}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState title="No items" description="Drop items here when ready." />
                )}
              </div>
            </div>
          )
        })}
        </div>
      </div>
    </div>
  )
}
