import { Button } from '@renderer/components/ui/button'
import { Combobox } from '@renderer/components/ui/combobox'
import { z } from 'zod'
import { useSettingsController } from './useSettingsController'

const gitlabSchema = z.object({
  baseUrl: z.string().url('Enter a valid base URL.'),
  token: z.string().min(10, 'Token is required.'),
  accountLabel: z.string().min(2, 'Account label is required.'),
  projects: z.string().optional(),
  groups: z.string().optional()
})

export function GitLabSettings({
  connMap,
  gitlab,
  setGitlab,
  gitlabTest,
  setGitlabTest,
  runTest,
  saveConnection,
  gitlabError,
  setGitlabError,
  gitlabProjectOptions,
  gitlabGroupOptions,
  appendToList
}: Pick<
  ReturnType<typeof useSettingsController>,
  | 'connMap'
  | 'gitlab'
  | 'setGitlab'
  | 'gitlabTest'
  | 'setGitlabTest'
  | 'runTest'
  | 'saveConnection'
  | 'gitlabError'
  | 'setGitlabError'
  | 'gitlabProjectOptions'
  | 'gitlabGroupOptions'
  | 'appendToList'
>) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold">GitLab</div>
          <div className="text-xs text-muted-foreground">
            {connMap.get('gitlab')?.hasToken ? 'Token stored securely' : 'Token required'}
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={gitlab.enabled}
            onChange={(event) => setGitlab((prev) => ({ ...prev, enabled: event.target.checked }))}
          />
          Enabled
        </label>
      </div>

      <div className="mt-4 grid gap-3 text-sm">
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Base URL</span>
          <input
            className="w-full rounded-lg border border-border bg-background px-3 py-2"
            placeholder="https://gitlab.yourcompany.com"
            value={gitlab.baseUrl}
            onChange={(event) => setGitlab((prev) => ({ ...prev, baseUrl: event.target.value }))}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Personal access token</span>
          <input
            type="password"
            className="w-full rounded-lg border border-border bg-background px-3 py-2"
            placeholder="••••••••••"
            value={gitlab.token}
            onChange={(event) => setGitlab((prev) => ({ ...prev, token: event.target.value }))}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Account label</span>
          <input
            className="w-full rounded-lg border border-border bg-background px-3 py-2"
            value={gitlab.accountLabel}
            onChange={(event) =>
              setGitlab((prev) => ({ ...prev, accountLabel: event.target.value }))
            }
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Tracked projects</span>
          <input
            className="w-full rounded-lg border border-border bg-background px-3 py-2"
            value={gitlab.projects}
            onChange={(event) => setGitlab((prev) => ({ ...prev, projects: event.target.value }))}
          />
        </label>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Combobox
            options={gitlabProjectOptions.map((project) => ({
              value: project,
              label: project
            }))}
            placeholder="Pick project"
            disabled={!gitlabProjectOptions.length}
            onSelect={(option) =>
              setGitlab((prev) => ({
                ...prev,
                projects: appendToList(prev.projects, option.value)
              }))
            }
          />
        </div>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Tracked groups</span>
          <input
            className="w-full rounded-lg border border-border bg-background px-3 py-2"
            value={gitlab.groups}
            onChange={(event) => setGitlab((prev) => ({ ...prev, groups: event.target.value }))}
          />
        </label>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Combobox
            options={gitlabGroupOptions.map((group) => ({ value: group, label: group }))}
            placeholder="Pick group"
            disabled={!gitlabGroupOptions.length}
            onSelect={(option) =>
              setGitlab((prev) => ({
                ...prev,
                groups: appendToList(prev.groups, option.value)
              }))
            }
          />
        </div>
        {gitlabError ? <div className="text-xs text-rose-500">{gitlabError}</div> : null}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              setGitlabError(null)
              const error = await saveConnection('gitlab', gitlab, gitlabSchema)
              setGitlabError(error)
            }}
          >
            Save
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              runTest('gitlab', { baseUrl: gitlab.baseUrl, token: gitlab.token }, setGitlabTest)
            }
          >
            {gitlabTest.status === 'testing' ? 'Testing...' : 'Test connection'}
          </Button>
        </div>
        {gitlabTest.status !== 'idle' ? (
          <div className="text-xs text-muted-foreground">{gitlabTest.message}</div>
        ) : null}
      </div>
    </div>
  )
}
