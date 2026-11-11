import { Button } from '@renderer/components/ui/button'
import { useDetailController } from './useDetailController'

export function ClickupDetails({
  clickupCommentMutation,
  item,
  clickupComment,
  setClickupComment,
  meta
}: Pick<
  ReturnType<typeof useDetailController> & {
    item: NonNullable<ReturnType<typeof useDetailController>['item']>
  },
  'items' | 'clickupCommentMutation' | 'item' | 'clickupComment' | 'setClickupComment' | 'meta'
>) {
  return (
    <div className="border-b border-border/60 pb-6">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        ClickUp details
      </div>
      <div className="mt-3 grid gap-2 text-sm">
        <div className="flex items-start justify-between gap-3 min-w-0">
          <span className="text-muted-foreground">Status</span>
          <span
            className="font-medium text-foreground text-right min-w-0 truncate"
            title={meta.status ?? item.status}
          >
            {meta.status ?? item.status}
          </span>
        </div>
        <div className="flex items-start justify-between gap-3 min-w-0">
          <span className="text-muted-foreground">Priority</span>
          <span
            className="font-medium text-foreground text-right min-w-0 truncate"
            title={meta.priority ?? 'None'}
          >
            {meta.priority ?? 'None'}
          </span>
        </div>
        <div className="flex items-start justify-between gap-3 min-w-0">
          <span className="text-muted-foreground">Assignees</span>
          <span
            className="font-medium text-foreground text-right min-w-0 break-words line-clamp-2"
            title={(meta.assignees ?? []).join(', ') || 'Unassigned'}
          >
            {(meta.assignees ?? []).join(', ') || 'Unassigned'}
          </span>
        </div>
        <div className="flex items-start justify-between gap-3 min-w-0">
          <span className="text-muted-foreground">List</span>
          <span
            className="font-medium text-foreground text-right min-w-0 truncate"
            title={meta.listName ?? 'Unknown'}
          >
            {meta.listName ?? 'Unknown'}
          </span>
        </div>
        <div className="flex items-start justify-between gap-3 min-w-0">
          <span className="text-muted-foreground">Folder</span>
          <span
            className="font-medium text-foreground text-right min-w-0 truncate"
            title={meta.folderName ?? '—'}
          >
            {meta.folderName ?? '—'}
          </span>
        </div>
        <div className="flex items-start justify-between gap-3 min-w-0">
          <span className="text-muted-foreground">Space</span>
          <span
            className="font-medium text-foreground text-right min-w-0 truncate"
            title={meta.spaceName ?? '—'}
          >
            {meta.spaceName ?? '—'}
          </span>
        </div>
        <div className="flex items-start justify-between gap-3 min-w-0">
          <span className="text-muted-foreground">Custom field</span>
          <span
            className="font-medium text-foreground text-right min-w-0 truncate"
            title={meta.customField ?? meta.equipe ?? '—'}
          >
            {meta.customField ?? meta.equipe ?? '—'}
          </span>
        </div>
        {item.dueAt ? (
          <div className="flex items-start justify-between gap-3 min-w-0">
            <span className="text-muted-foreground">Due</span>
            <span
              className="font-medium text-foreground text-right min-w-0 truncate"
              title={new Date(item.dueAt).toLocaleString()}
            >
              {new Date(item.dueAt).toLocaleString()}
            </span>
          </div>
        ) : null}
      </div>
      <div className="mt-5 grid gap-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Actions
        </div>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Add comment</span>
          <textarea
            className="min-h-[80px] w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={clickupComment}
            onChange={(event) => setClickupComment(event.target.value)}
            placeholder="Leave a comment on this task..."
          />
        </label>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            if (!clickupComment.trim()) return
            const taskId = item.id.replace('cu-task-', '')
            clickupCommentMutation.mutate({ taskId, body: clickupComment })
            setClickupComment('')
          }}
        >
          Post comment
        </Button>
      </div>
    </div>
  )
}
