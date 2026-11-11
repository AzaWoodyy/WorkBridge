import { Button } from '@renderer/components/ui/button'
import { Combobox } from '@renderer/components/ui/combobox'
import { z } from 'zod'
import { useSettingsController } from './useSettingsController'

const clickupSchema = z.object({
  token: z.string().min(10, 'Token is required.'),
  accountLabel: z.string().min(2, 'Account label is required.'),
  listIds: z.string().optional(),
  customFieldId: z.string().optional(),
  customFieldValue: z.string().optional(),
  customFieldOptionId: z.string().optional()
})

export function ClickUpSettings({
  connMap,
  clickup,
  setClickup,
  clickupTest,
  setClickupTest,
  runTest,
  loadCustomFieldOptions,
  changeCustomField,
  saveConnection,
  clickupError,
  setClickupError,
  clickupListOptions,
  customFieldOptions,
  appendToList
}: Pick<
  ReturnType<typeof useSettingsController>,
  | 'connMap'
  | 'clickup'
  | 'setClickup'
  | 'clickupTest'
  | 'setClickupTest'
  | 'runTest'
  | 'loadCustomFieldOptions'
  | 'changeCustomField'
  | 'saveConnection'
  | 'clickupError'
  | 'setClickupError'
  | 'clickupListOptions'
  | 'customFieldOptions'
  | 'appendToList'
>) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold">ClickUp</div>
          <div className="text-xs text-muted-foreground">
            {connMap.get('clickup')?.hasToken ? 'Token stored securely' : 'Token required'}
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={clickup.enabled}
            onChange={(event) => setClickup((prev) => ({ ...prev, enabled: event.target.checked }))}
          />
          Enabled
        </label>
      </div>
      <div className="mt-4 grid gap-3 text-sm">
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">API token</span>
          <input
            type="password"
            className="w-full rounded-lg border border-border bg-background px-3 py-2"
            value={clickup.token}
            onChange={(event) => setClickup((prev) => ({ ...prev, token: event.target.value }))}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Account label</span>
          <input
            className="w-full rounded-lg border border-border bg-background px-3 py-2"
            value={clickup.accountLabel}
            onChange={(event) =>
              setClickup((prev) => ({ ...prev, accountLabel: event.target.value }))
            }
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Tracked list IDs</span>
          <input
            className="w-full rounded-lg border border-border bg-background px-3 py-2"
            value={clickup.listIds}
            onChange={(event) => setClickup((prev) => ({ ...prev, listIds: event.target.value }))}
            placeholder="12345678, 87654321"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Combobox
            options={clickupListOptions.map((list) => ({
              value: list.id,
              label: list.label
            }))}
            placeholder="Pick list"
            disabled={!clickupListOptions.length}
            onSelect={(option) =>
              setClickup((prev) => ({
                ...prev,
                listIds: appendToList(prev.listIds, option.value)
              }))
            }
          />
        </div>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Custom field name or ID</span>
          <input
            className="w-full rounded-lg border border-border bg-background px-3 py-2"
            value={clickup.customFieldId}
            onChange={(event) => changeCustomField(event.target.value)}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Option label</span>
          <input
            className="w-full rounded-lg border border-border bg-background px-3 py-2"
            value={clickup.customFieldValue}
            onChange={(event) =>
              setClickup((prev) => ({ ...prev, customFieldValue: event.target.value }))
            }
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Option ID</span>
          <input
            className="w-full rounded-lg border border-border bg-background px-3 py-2"
            value={clickup.customFieldOptionId}
            onChange={(event) =>
              setClickup((prev) => ({ ...prev, customFieldOptionId: event.target.value }))
            }
          />
        </label>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Button variant="outline" size="sm" onClick={loadCustomFieldOptions}>
            Load field options
          </Button>
          <Combobox
            options={customFieldOptions.map((option) => ({
              value: option.id,
              label: option.name
            }))}
            placeholder="Pick option"
            disabled={!customFieldOptions.length}
            onSelect={(option) =>
              setClickup((prev) => ({
                ...prev,
                customFieldValue:
                  customFieldOptions.find((entry) => entry.id === option.value)?.name ??
                  prev.customFieldValue,
                customFieldOptionId: option.value
              }))
            }
          />
        </div>
        {clickupError ? <div className="text-xs text-rose-500">{clickupError}</div> : null}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              setClickupError(null)
              const error = await saveConnection('clickup', clickup, clickupSchema)
              setClickupError(error)
            }}
          >
            Save
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => runTest('clickup', { token: clickup.token }, setClickupTest)}
          >
            {clickupTest.status === 'testing' ? 'Testing...' : 'Test connection'}
          </Button>
        </div>
        {clickupTest.status !== 'idle' ? (
          <div className="text-xs text-muted-foreground">{clickupTest.message}</div>
        ) : null}
      </div>
    </div>
  )
}
