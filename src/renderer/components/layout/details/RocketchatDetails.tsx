import { useRuntimeInfo } from '@renderer/data/useRuntimeInfo'
import { Button } from '@renderer/components/ui/button'
import { useDetailController } from './useDetailController'

export function RocketchatDetails({
  rocketReplyMutation,
  rocketReactMutation,
  item,
  rocketReply,
  setRocketReply,
  rocketEmoji,
  setRocketEmoji,
  rocketQuickReactions,
  displayRocketEmoji,
  normalizeRocketEmoji,
  meta
}: Pick<
  ReturnType<typeof useDetailController> & {
    item: NonNullable<ReturnType<typeof useDetailController>['item']>
  },
  | 'items'
  | 'rocketReplyMutation'
  | 'rocketReactMutation'
  | 'item'
  | 'rocketReply'
  | 'setRocketReply'
  | 'rocketEmoji'
  | 'setRocketEmoji'
  | 'rocketQuickReactions'
  | 'displayRocketEmoji'
  | 'normalizeRocketEmoji'
  | 'meta'
>) {
  const { data: runtime } = useRuntimeInfo()
  return (
    <fieldset disabled={runtime?.demo} className="min-w-0 border-b border-border/60 pb-6">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Rocket.Chat details
      </div>
      <div className="mt-3 grid gap-2 text-sm">
        <div className="flex items-start justify-between gap-3 min-w-0">
          <span className="text-muted-foreground">Room</span>
          <span
            className="font-medium text-foreground text-right min-w-0 truncate"
            title={item.projectOrRoom}
          >
            {item.projectOrRoom}
          </span>
        </div>
        <div className="flex items-start justify-between gap-3 min-w-0">
          <span className="text-muted-foreground">Author</span>
          <span
            className="font-medium text-foreground text-right min-w-0 truncate"
            title={meta.author ?? 'Unknown'}
          >
            {meta.author ?? 'Unknown'}
          </span>
        </div>
        <div className="flex items-start justify-between gap-3 min-w-0">
          <span className="text-muted-foreground">Review request</span>
          <span className="font-medium text-foreground text-right">
            {meta.reviewRequest ? 'Yes' : 'No'}
          </span>
        </div>
      </div>
      <div className="mt-5 grid gap-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Actions
        </div>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Reply in thread</span>
          <textarea
            className="min-h-[80px] w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={rocketReply}
            onChange={(event) => setRocketReply(event.target.value)}
            placeholder="Write a threaded reply..."
          />
        </label>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            if (!rocketReply.trim()) return
            const messageId = item.id.replace('rc-msg-', '')
            const roomId = meta.roomId
            if (!roomId) return
            rocketReplyMutation.mutate({ roomId, threadId: messageId, body: rocketReply })
            setRocketReply('')
          }}
        >
          Post reply
        </Button>
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Quick reactions
          </div>
          <div className="flex flex-wrap gap-2">
            {rocketQuickReactions.map((emoji) => (
              <button
                key={emoji}
                className="rounded-full border border-border/70 bg-muted/30 px-3 py-1 text-lg transition hover:bg-muted"
                onClick={() => {
                  const messageId = item.id.replace('rc-msg-', '')
                  rocketReactMutation.mutate({ messageId, emoji, shouldReact: true })
                }}
              >
                {displayRocketEmoji(emoji)}
              </button>
            ))}
          </div>
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">Custom reaction</span>
            <div className="flex items-center gap-2">
              <input
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={rocketEmoji}
                onChange={(event) => setRocketEmoji(event.target.value)}
                placeholder=":eyes: or 👀"
              />
              <span className="text-lg">
                {rocketEmoji ? displayRocketEmoji(normalizeRocketEmoji(rocketEmoji)) : '✨'}
              </span>
            </div>
          </label>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (!rocketEmoji.trim()) return
              const messageId = item.id.replace('rc-msg-', '')
              const normalized = normalizeRocketEmoji(rocketEmoji)
              rocketReactMutation.mutate({ messageId, emoji: normalized, shouldReact: true })
              setRocketEmoji('')
            }}
          >
            Add reaction
          </Button>
        </div>
        {meta.reactions ? (
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Reactions
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(
                meta.reactions as Record<string, { count?: number; usernames?: string[] }>
              ).map(([emoji, data]) => (
                <div
                  key={emoji}
                  className="flex items-center gap-2 rounded-full border border-border/60 px-3 py-1 text-sm"
                >
                  <span>{displayRocketEmoji(emoji)}</span>
                  <span className="text-xs text-muted-foreground">{data?.count ?? 1}</span>
                  {data?.usernames?.length ? (
                    <span className="text-[11px] text-muted-foreground">
                      {data.usernames.join(', ')}
                    </span>
                  ) : null}
                  <button
                    className="text-[11px] text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      const messageId = item.id.replace('rc-msg-', '')
                      rocketReactMutation.mutate({ messageId, emoji, shouldReact: false })
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </fieldset>
  )
}
