import { useRuntimeInfo } from '@renderer/data/useRuntimeInfo'
import { Button } from '@renderer/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@renderer/components/ui/dialog'
import { testNotification } from '@renderer/data/api'
import { ClickUpSettings } from './settings/ClickUpSettings'
import { GitLabSettings } from './settings/GitLabSettings'
import { RocketChatSettings } from './settings/RocketChatSettings'
import { useSettingsController } from './settings/useSettingsController'

export function Settings() {
  const { data: runtime } = useRuntimeInfo()
  const {
    flushMutation,
    cadence,
    cadenceMutation,
    connMap,
    gitlab,
    setGitlab,
    clickup,
    setClickup,
    rocket,
    setRocket,
    gitlabTest,
    setGitlabTest,
    clickupTest,
    setClickupTest,
    rocketTest,
    setRocketTest,
    runTest,
    loadCustomFieldOptions,
    changeCustomField,
    saveConnection,
    gitlabError,
    setGitlabError,
    clickupError,
    setClickupError,
    rocketError,
    setRocketError,
    cadenceOpen,
    setCadenceOpen,
    cadenceMinutes,
    setCadenceMinutes,
    notificationTest,
    setNotificationTest,
    gitlabProjectOptions,
    gitlabGroupOptions,
    clickupListOptions,
    customFieldOptions,
    rocketRoomOptions,
    appendToList
  } = useSettingsController()

  return (
    <>
      <div className="space-y-6">
        <div className="rounded-2xl border border-border/70 bg-card p-6">
          <h2 className="text-lg font-semibold">Settings</h2>
          <p className="text-sm text-muted-foreground">Configure integrations and sync behavior.</p>
        </div>

        {runtime?.demo ? (
          <p role="status" className="text-sm text-muted-foreground">
            Demo mode: connection settings are disabled. No credentials are read or saved.
          </p>
        ) : null}
        <fieldset disabled={runtime?.demo} className="grid gap-6 lg:grid-cols-2">
          <GitLabSettings
            connMap={connMap}
            gitlab={gitlab}
            setGitlab={setGitlab}
            gitlabTest={gitlabTest}
            setGitlabTest={setGitlabTest}
            runTest={runTest}
            saveConnection={saveConnection}
            gitlabError={gitlabError}
            setGitlabError={setGitlabError}
            gitlabProjectOptions={gitlabProjectOptions}
            gitlabGroupOptions={gitlabGroupOptions}
            appendToList={appendToList}
          />

          <ClickUpSettings
            connMap={connMap}
            clickup={clickup}
            setClickup={setClickup}
            clickupTest={clickupTest}
            setClickupTest={setClickupTest}
            runTest={runTest}
            loadCustomFieldOptions={loadCustomFieldOptions}
            changeCustomField={changeCustomField}
            saveConnection={saveConnection}
            clickupError={clickupError}
            setClickupError={setClickupError}
            clickupListOptions={clickupListOptions}
            customFieldOptions={customFieldOptions}
            appendToList={appendToList}
          />

          <RocketChatSettings
            connMap={connMap}
            rocket={rocket}
            setRocket={setRocket}
            rocketTest={rocketTest}
            setRocketTest={setRocketTest}
            runTest={runTest}
            saveConnection={saveConnection}
            rocketError={rocketError}
            setRocketError={setRocketError}
            rocketRoomOptions={rocketRoomOptions}
            appendToList={appendToList}
          />

          <div className="rounded-2xl border border-border/70 bg-card p-6">
            <div className="text-sm font-semibold">Sync cadence</div>
            <div className="mt-2 text-sm text-muted-foreground">
              Polling every {cadence?.minutes ?? cadenceMinutes} minutes.
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="mt-4"
              onClick={() => setCadenceOpen(true)}
            >
              Adjust schedule
            </Button>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card p-6">
            <div className="text-sm font-semibold">Notifications</div>
            <div className="mt-2 text-sm text-muted-foreground">
              Test desktop notifications and confirm they are enabled in macOS Settings.
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="mt-4"
              onClick={async () => {
                const result = await testNotification()
                setNotificationTest(
                  result.ok ? 'Notification sent.' : (result.message ?? 'Notification failed.')
                )
              }}
            >
              Send test notification
            </Button>
            {notificationTest ? (
              <div className="mt-2 text-xs text-muted-foreground">{notificationTest}</div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-rose-200/60 bg-rose-50/60 p-6 dark:border-rose-500/20 dark:bg-rose-500/10">
            <div className="text-sm font-semibold text-rose-600 dark:text-rose-300">
              Danger zone
            </div>
            <div className="mt-2 text-sm text-rose-700/80 dark:text-rose-200/80">
              This clears all local data, planner states, links, and stored tokens.
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 border-rose-300 text-rose-600 hover:bg-rose-100 dark:border-rose-500/40 dark:text-rose-200"
              onClick={() => {
                const confirm = window.confirm(
                  'This will delete all local data and tokens. Continue?'
                )
                if (confirm) {
                  flushMutation.mutate()
                }
              }}
            >
              Reset local data
            </Button>
          </div>
        </fieldset>
      </div>

      <Dialog open={cadenceOpen} onOpenChange={setCadenceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sync cadence</DialogTitle>
          </DialogHeader>
          <div className="mt-2 text-sm text-muted-foreground">
            Set the global polling delay (minutes). Changes apply immediately.
          </div>
          <div className="mt-4">
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">
                Polling interval (1 - 60 minutes)
              </span>
              <input
                type="number"
                min={1}
                max={60}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={cadenceMinutes}
                onChange={(event) => setCadenceMinutes(Number(event.target.value || 1))}
              />
            </label>
          </div>
          <div className="mt-4 flex justify-end">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setCadenceOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  cadenceMutation.mutate(cadenceMinutes)
                  setCadenceOpen(false)
                }}
              >
                Save cadence
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
