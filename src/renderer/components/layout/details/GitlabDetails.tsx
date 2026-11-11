import { useRuntimeInfo } from '@renderer/data/useRuntimeInfo'
import { Button } from '@renderer/components/ui/button'
import { UserMultiCombobox } from '@renderer/components/ui/user-multi-combobox'
import { useDetailController } from './useDetailController'

export function GitlabDetails({
  gitlabNoteMutation,
  gitlabLabelsMutation,
  gitlabReviewersMutation,
  gitlabApproveMutation,
  gitlabUnapproveMutation,
  item,
  mrComment,
  setMrComment,
  mrLabels,
  setMrLabels,
  mrAssignees,
  setMrAssignees,
  mrReviewers,
  setMrReviewers,
  gitlabMembers,
  gitlabMembersLoading,
  gitlabMembersError,
  relatedMessages,
  meta,
  isApproved
}: Pick<
  ReturnType<typeof useDetailController> & {
    item: NonNullable<ReturnType<typeof useDetailController>['item']>
  },
  | 'items'
  | 'gitlabNoteMutation'
  | 'gitlabLabelsMutation'
  | 'gitlabReviewersMutation'
  | 'gitlabApproveMutation'
  | 'gitlabUnapproveMutation'
  | 'item'
  | 'note'
  | 'mrComment'
  | 'setMrComment'
  | 'mrLabels'
  | 'setMrLabels'
  | 'mrAssignees'
  | 'setMrAssignees'
  | 'mrReviewers'
  | 'setMrReviewers'
  | 'gitlabMembers'
  | 'gitlabMembersLoading'
  | 'gitlabMembersError'
  | 'relatedMessages'
  | 'meta'
  | 'isApproved'
>) {
  const { data: runtime } = useRuntimeInfo()
  return (
    <fieldset disabled={runtime?.demo} className="min-w-0 border-b border-border/60 pb-6">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        GitLab details
      </div>
      <div className="mt-3 grid gap-2 text-sm">
        <div className="flex items-start justify-between gap-3 min-w-0">
          <span className="text-muted-foreground">State</span>
          <span
            className="font-medium text-foreground text-right min-w-0 truncate"
            title={meta.state ?? item.status}
          >
            {meta.state ?? item.status}
          </span>
        </div>
        <div className="flex items-start justify-between gap-3 min-w-0">
          <span className="text-muted-foreground">Draft</span>
          <span className="font-medium text-foreground text-right">
            {meta.draft ? 'Yes' : 'No'}
          </span>
        </div>
        <div className="flex items-start justify-between gap-3 min-w-0">
          <span className="text-muted-foreground">Approved</span>
          <span className="font-medium text-foreground text-right">
            {isApproved ? 'Yes' : 'No'}
          </span>
        </div>
        <div className="flex items-start justify-between gap-3 min-w-0">
          <span className="text-muted-foreground">Pipeline</span>
          <span
            className="font-medium text-foreground text-right min-w-0 truncate"
            title={meta.pipelineStatus ?? 'Unknown'}
          >
            {meta.pipelineStatus ?? 'Unknown'}
          </span>
        </div>
        <div className="flex items-start justify-between gap-3 min-w-0">
          <span className="text-muted-foreground">Reviewers</span>
          <span
            className="font-medium text-foreground text-right min-w-0 break-words line-clamp-2"
            title={(meta.reviewers ?? []).join(', ') || 'None'}
          >
            {(meta.reviewers ?? []).join(', ') || 'None'}
          </span>
        </div>
        <div className="flex items-start justify-between gap-3 min-w-0">
          <span className="text-muted-foreground">Assignees</span>
          <span
            className="font-medium text-foreground text-right min-w-0 break-words line-clamp-2"
            title={(meta.assignees ?? []).join(', ') || 'None'}
          >
            {(meta.assignees ?? []).join(', ') || 'None'}
          </span>
        </div>
        <div className="flex items-start justify-between gap-3 min-w-0">
          <span className="text-muted-foreground">Approvals</span>
          <span
            className="font-medium text-foreground text-right min-w-0 truncate"
            title="Approvals"
          >
            {meta.approvals
              ? `${meta.approvals.approvedBy?.length ?? 0} approved · ${meta.approvals.approvalsLeft ?? '?'} left`
              : 'Not available'}
          </span>
        </div>
      </div>
      <div className="mt-5 grid gap-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Actions
        </div>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Add comment</span>
          <textarea
            className="min-h-[80px] w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={mrComment}
            onChange={(event) => setMrComment(event.target.value)}
            placeholder="Leave a note on this MR..."
          />
        </label>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            if (!mrComment.trim()) return
            gitlabNoteMutation.mutate({
              projectId: meta.projectId,
              iid: meta.iid,
              body: mrComment
            })
            setMrComment('')
          }}
        >
          Post comment
        </Button>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Labels (comma separated)</span>
          <input
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={mrLabels}
            onChange={(event) => setMrLabels(event.target.value)}
          />
        </label>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            gitlabLabelsMutation.mutate({
              projectId: meta.projectId,
              iid: meta.iid,
              labels: mrLabels
                .split(',')
                .map((entry) => entry.trim())
                .filter(Boolean)
            })
          }
        >
          Update labels
        </Button>
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Assignees</span>
          <UserMultiCombobox
            options={gitlabMembers}
            selected={mrAssignees}
            onChange={setMrAssignees}
            placeholder={gitlabMembersLoading ? 'Loading members…' : 'Select assignees'}
            disabled={gitlabMembersLoading || gitlabMembers.length === 0}
          />
          {gitlabMembersError ? (
            <div className="text-xs text-rose-500">{gitlabMembersError}</div>
          ) : null}
        </div>
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Reviewers</span>
          <UserMultiCombobox
            options={gitlabMembers}
            selected={mrReviewers}
            onChange={setMrReviewers}
            placeholder={gitlabMembersLoading ? 'Loading members…' : 'Select reviewers'}
            disabled={gitlabMembersLoading || gitlabMembers.length === 0}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            gitlabReviewersMutation.mutate({
              projectId: meta.projectId,
              iid: meta.iid,
              assignees: mrAssignees,
              reviewers: mrReviewers
            })
          }
        >
          Update assignees & reviewers
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              gitlabApproveMutation.mutate({ projectId: meta.projectId, iid: meta.iid })
            }
          >
            Approve
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              gitlabUnapproveMutation.mutate({ projectId: meta.projectId, iid: meta.iid })
            }
          >
            Unapprove
          </Button>
        </div>
      </div>
      {relatedMessages.length ? (
        <div className="mt-6 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Linked messages
          </div>
          {relatedMessages.map((message) => (
            <div key={message.id} className="rounded-lg border border-border/60 p-3 text-sm">
              <div className="text-xs text-muted-foreground">
                {message.meta?.author ? `@${message.meta.author}` : 'Rocket.Chat'} •{' '}
                {message.projectOrRoom}
              </div>
              <div
                className="mt-2 text-sm text-foreground break-words line-clamp-3"
                title={message.snippet}
              >
                {message.snippet}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </fieldset>
  )
}
