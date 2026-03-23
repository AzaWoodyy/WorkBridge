import { ItemCard } from '@renderer/components/ItemCard'
import { EmptyState } from '@renderer/components/EmptyState'
import { LoadingSkeleton } from '@renderer/components/LoadingSkeleton'
import { useItems, useLinks, usePlanner } from '@renderer/data/useDbData'
import { useAppStore } from '@renderer/store/appStore'

export function Dashboard() {
  const { data: items, isLoading } = useItems()
  const { data: planner } = usePlanner()
  const { data: links } = useLinks()
  const openDrawer = useAppStore((state) => state.openDrawer)

  const needsReview = items?.filter((item) => item.needsReview) ?? []
  const inboxItems = planner
    ?.filter((state) => state.lane === 'inbox')
    .map((state) => items?.find((item) => item.id === state.itemId))
    .filter(Boolean) ?? []

  const dueItems = items?.filter((item) => item.dueAt) ?? []
  const dueToday = dueItems.filter((item) => {
    const date = item.dueAt ? new Date(item.dueAt) : null
    if (!date) return false
    const now = new Date()
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()
  })
  const overdue = dueItems.filter((item) => {
    const date = item.dueAt ? new Date(item.dueAt) : null
    if (!date) return false
    const now = new Date()
    return date.getTime() < now.getTime() && !(date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate())
  })

  const getLinkedCount = (id: string) => links?.filter((link) => link.fromItemId === id || link.toItemId === id).length ?? 0
  const laneById = new Map(planner?.map((state) => [state.itemId, state.lane]))

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Review queue</h2>
              <p className="text-sm text-muted-foreground">Review requests from Rocket.Chat and GitLab.</p>
            </div>
            <div className="text-xs text-muted-foreground">{needsReview.length} items</div>
          </div>
          {isLoading ? (
            <LoadingSkeleton className="h-32" />
          ) : needsReview.length === 0 ? (
            <EmptyState title="No review requests" description="When reviews arrive, they will show up here." />
          ) : (
            <div className="divide-y divide-border">
              {needsReview.map((item) => (
                <div key={item.id} className="py-2">
                  <ItemCard
                    item={item}
                    lane={laneById.get(item.id)}
                    linkedCount={getLinkedCount(item.id)}
                    onSelect={openDrawer}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Due today</div>
            <div className="mt-2 text-lg font-semibold">{dueToday.length} tasks</div>
            <p className="text-sm text-muted-foreground">Priority items due today.</p>
          </div>
          {dueToday.length ? (
            <div className="divide-y divide-border">
              {dueToday.slice(0, 4).map((item) => (
                <div key={item.id} className="py-2">
                  <ItemCard
                    item={item}
                    lane={laneById.get(item.id)}
                    linkedCount={getLinkedCount(item.id)}
                    onSelect={openDrawer}
                  />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="All clear" description="No tasks are due today." />
          )}

          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Overdue</div>
            <div className="mt-2 text-lg font-semibold">{overdue.length} tasks</div>
            <p className="text-sm text-muted-foreground">Overdue items that need attention.</p>
          </div>
          {overdue.length ? (
            <div className="divide-y divide-border">
              {overdue.slice(0, 4).map((item) => (
                <div key={item.id} className="py-2">
                  <ItemCard
                    item={item}
                    lane={laneById.get(item.id)}
                    linkedCount={getLinkedCount(item.id)}
                    onSelect={openDrawer}
                  />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Nothing overdue" description="Great job staying on schedule." />
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Inbox triage</h2>
            <p className="text-sm text-muted-foreground">Untriaged items across all sources.</p>
          </div>
          <div className="text-xs text-muted-foreground">{inboxItems.length} items</div>
        </div>
        {inboxItems.length ? (
          <div className="divide-y divide-border">
            {inboxItems.slice(0, 6).map((item) => (
              <div key={item!.id} className="py-2">
                <ItemCard
                  item={item!}
                  lane="inbox"
                  linkedCount={getLinkedCount(item!.id)}
                  onSelect={openDrawer}
                />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Inbox cleared" description="No items are waiting for triage." />
        )}
      </section>
    </div>
  )
}
