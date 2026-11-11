import { Button } from '@renderer/components/ui/button'
import { Combobox } from '@renderer/components/ui/combobox'
import { z } from 'zod'
import { useSettingsController } from './useSettingsController'

const rocketchatSchema = z.object({
  baseUrl: z.string().url('Enter a valid base URL.'),
  token: z.string().min(10, 'Token is required.'),
  userId: z.string().min(3, 'User ID is required.'),
  accountLabel: z.string().min(2, 'Account label is required.'),
  rooms: z.string().optional(),
  lookbackDays: z.coerce.number().min(1, 'Lookback must be at least 1 day.').max(90, 'Max 90 days.')
})
export function RocketChatSettings({
  connMap,
  rocket,
  setRocket,
  rocketTest,
  setRocketTest,
  runTest,
  saveConnection,
  rocketError,
  setRocketError,
  rocketRoomOptions,
  appendToList
}: Pick<
  ReturnType<typeof useSettingsController>,
  | 'connMap'
  | 'rocket'
  | 'setRocket'
  | 'rocketTest'
  | 'setRocketTest'
  | 'runTest'
  | 'saveConnection'
  | 'rocketError'
  | 'setRocketError'
  | 'rocketRoomOptions'
  | 'appendToList'
>) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold">Rocket.Chat</div>
          <div className="text-xs text-muted-foreground">
            {connMap.get('rocketchat')?.hasToken ? 'Token stored securely' : 'Token required'}
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={rocket.enabled}
            onChange={(event) => setRocket((prev) => ({ ...prev, enabled: event.target.checked }))}
          />
          Enabled
        </label>
      </div>
      <div className="mt-4 grid gap-3 text-sm">
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Base URL</span>
          <input
            className="w-full rounded-lg border border-border bg-background px-3 py-2"
            value={rocket.baseUrl}
            onChange={(event) => setRocket((prev) => ({ ...prev, baseUrl: event.target.value }))}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">User token</span>
          <input
            type="password"
            className="w-full rounded-lg border border-border bg-background px-3 py-2"
            value={rocket.token}
            onChange={(event) => setRocket((prev) => ({ ...prev, token: event.target.value }))}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">User ID</span>
          <input
            className="w-full rounded-lg border border-border bg-background px-3 py-2"
            placeholder="Rocket.Chat user id"
            value={rocket.userId}
            onChange={(event) => setRocket((prev) => ({ ...prev, userId: event.target.value }))}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Account label</span>
          <input
            className="w-full rounded-lg border border-border bg-background px-3 py-2"
            value={rocket.accountLabel}
            onChange={(event) =>
              setRocket((prev) => ({ ...prev, accountLabel: event.target.value }))
            }
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Tracked rooms / channels</span>
          <input
            className="w-full rounded-lg border border-border bg-background px-3 py-2"
            placeholder="#app-review, #release"
            value={rocket.rooms}
            onChange={(event) => setRocket((prev) => ({ ...prev, rooms: event.target.value }))}
          />
        </label>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Combobox
            options={rocketRoomOptions.map((room) => ({ value: room, label: room }))}
            placeholder="Pick room"
            disabled={!rocketRoomOptions.length}
            onSelect={(option) =>
              setRocket((prev) => ({
                ...prev,
                rooms: appendToList(prev.rooms, option.value)
              }))
            }
          />
        </div>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Lookback window (days)</span>
          <input
            type="number"
            min={1}
            max={90}
            className="w-full rounded-lg border border-border bg-background px-3 py-2"
            value={rocket.lookbackDays}
            onChange={(event) =>
              setRocket((prev) => ({
                ...prev,
                lookbackDays: Number(event.target.value || 1)
              }))
            }
          />
        </label>
        {rocketError ? <div className="text-xs text-rose-500">{rocketError}</div> : null}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              setRocketError(null)
              const error = await saveConnection('rocketchat', rocket, rocketchatSchema)
              setRocketError(error)
            }}
          >
            Save
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              runTest(
                'rocketchat',
                { baseUrl: rocket.baseUrl, token: rocket.token, userId: rocket.userId },
                setRocketTest
              )
            }
          >
            {rocketTest.status === 'testing' ? 'Testing...' : 'Test connection'}
          </Button>
        </div>
        {rocketTest.status !== 'idle' ? (
          <div className="text-xs text-muted-foreground">{rocketTest.message}</div>
        ) : null}
      </div>
    </div>
  )
}
