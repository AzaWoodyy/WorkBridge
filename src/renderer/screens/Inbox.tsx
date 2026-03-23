import { useMemo, useState } from 'react'
import { ItemCard } from '@renderer/components/ItemCard'
import { EmptyState } from '@renderer/components/EmptyState'
import { LoadingSkeleton } from '@renderer/components/LoadingSkeleton'
import { useItems, useLinks, usePlanner } from '@renderer/data/useDbData'
import { useAppStore } from '@renderer/store/appStore'
import { Button } from '@renderer/components/ui/button'
import { cn } from '@renderer/lib/utils'

export function Inbox() {
  const { data: items, isLoading } = useItems()
  const { data: planner } = usePlanner()
  const { data: links } = useLinks()
  const openDrawer = useAppStore((state) => state.openDrawer)

  const inboxItems = planner
    ?.filter((state) => state.lane === 'inbox')
    .map((state) => items?.find((item) => item.id === state.itemId))
    .filter(Boolean)
  const reviewItems = inboxItems?.filter((item) => item?.needsReview) ?? []

  const getLinkedCount = (id: string) => links?.filter((link) => link.fromItemId === id || link.toItemId === id).length ?? 0

  const [filters, setFilters] = useState({
    needsReview: false,
    merged: false,
    draft: false,
    failedPipeline: false,
    gitlab: false,
    clickup: false,
    rocketchat: false
  })

  const filteredItems = useMemo(() => {
    if (!inboxItems) return []
    const activeFilters = Object.values(filters).some(Boolean)
    if (!activeFilters) return inboxItems

    return inboxItems.filter((item) => {
      if (!item) return false
      const meta = item.meta ?? {}
      const sourceFilters = [filters.gitlab, filters.clickup, filters.rocketchat].some(Boolean)
      if (sourceFilters) {
        if (filters.gitlab && item.source !== 'gitlab') return false
        if (filters.clickup && item.source !== 'clickup') return false
        if (filters.rocketchat && item.source !== 'rocketchat') return false
      }
      if (filters.needsReview && !item.needsReview) return false
      if (filters.merged || filters.draft || filters.failedPipeline) {
        if (item.source !== 'gitlab') return false
        if (filters.merged && meta.state !== 'merged') return false
        if (filters.draft && !meta.draft) return false
        if (filters.failedPipeline && meta.pipelineStatus !== 'failed') return false
      }
      return true
    })
  }, [filters, inboxItems])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Unified inbox</h2>
          <p className="text-sm text-muted-foreground">Sort incoming work from GitLab, ClickUp, and Rocket.Chat.</p>
        </div>
        <div className="text-xs text-muted-foreground">{filteredItems.length} items</div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: 'gitlab', label: 'GitLab' },
          { key: 'clickup', label: 'ClickUp' },
          { key: 'rocketchat', label: 'Rocket.Chat' }
        ].map((filter) => (
          <Button
            key={filter.key}
            variant="outline"
            size="sm"
            className={cn(
              'h-8 px-3 text-xs',
              filters[filter.key as keyof typeof filters] && 'border-primary text-primary'
            )}
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                [filter.key]: !prev[filter.key as keyof typeof filters]
              }))
            }
          >
            {filter.label}
          </Button>
        ))}
        {[
          { key: 'needsReview', label: 'Needs review' },
          { key: 'merged', label: 'Merged' },
          { key: 'draft', label: 'Draft' },
          { key: 'failedPipeline', label: 'Failed pipeline' }
        ].map((filter) => (
          <Button
            key={filter.key}
            variant="outline"
            size="sm"
            className={cn(
              'h-8 px-3 text-xs',
              filters[filter.key as keyof typeof filters] && 'border-primary text-primary'
            )}
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                [filter.key]: !prev[filter.key as keyof typeof filters]
              }))
            }
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {reviewItems.length ? (
        <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Review queue</div>
              <div className="mt-2 text-lg font-semibold">{reviewItems.length} review requests</div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  needsReview: true
                }))
              }
            >
              Focus review
            </Button>
          </div>
          <div className="mt-4 divide-y divide-border">
            {reviewItems.slice(0, 3).map((item) => (
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
        </div>
      ) : null}

      {isLoading ? (
        <LoadingSkeleton className="h-32" />
      ) : filteredItems && filteredItems.length > 0 ? (
        <div className="divide-y divide-border">
          {filteredItems.map((item) => (
            <div key={item?.id} className="py-2">
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
        <EmptyState title="Inbox cleared" description="No items are waiting for triage right now." />
      )}
    </div>
  )
}
