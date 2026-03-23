import { useEffect, useMemo, useState } from 'react'
import { z } from 'zod'
import { Button } from '@renderer/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@renderer/components/ui/dialog'
import { Combobox } from '@renderer/components/ui/combobox'
import {
  useConnections,
  useConnectionMutation,
  useStoreTokenMutation,
  useTestConnectionMutation,
  useFlushAllMutation,
  useSyncCadence,
  useSyncCadenceMutation
} from '@renderer/data/useDbData'
import {
  fetchClickUpEquipeOptions,
  fetchClickUpLists,
  fetchGitLabGroups,
  fetchGitLabProjects,
  fetchRocketChatRooms
} from '@renderer/data/api'
import type { Connection } from '@renderer/data/types'

type TestState = { status: 'idle' | 'testing' | 'success' | 'error'; message?: string }

const gitlabSchema = z.object({
  baseUrl: z.string().url('Enter a valid base URL.'),
  token: z.string().min(10, 'Token is required.'),
  accountLabel: z.string().min(2, 'Account label is required.'),
  projects: z.string().optional(),
  groups: z.string().optional()
})

const clickupSchema = z.object({
  token: z.string().min(10, 'Token is required.'),
  accountLabel: z.string().min(2, 'Account label is required.'),
  listIds: z.string().optional(),
  equipeFieldId: z.string().optional(),
  equipeValue: z.string().optional(),
  equipeOptionId: z.string().optional()
})

const rocketchatSchema = z.object({
  baseUrl: z.string().url('Enter a valid base URL.'),
  token: z.string().min(10, 'Token is required.'),
  userId: z.string().min(3, 'User ID is required.'),
  accountLabel: z.string().min(2, 'Account label is required.'),
  rooms: z.string().optional(),
  lookbackDays: z.coerce.number().min(1, 'Lookback must be at least 1 day.').max(90, 'Max 90 days.')
})

export function Settings() {
  const { data: connections } = useConnections()
  const connectionMutation = useConnectionMutation()
  const storeTokenMutation = useStoreTokenMutation()
  const testMutation = useTestConnectionMutation()
  const flushMutation = useFlushAllMutation()
  const { data: cadence } = useSyncCadence()
  const cadenceMutation = useSyncCadenceMutation()

  const connMap = useMemo(() => {
    const map = new Map<string, Connection>()
    connections?.forEach((conn) => map.set(conn.source, conn))
    return map
  }, [connections])

  const [gitlab, setGitlab] = useState({
    baseUrl: connMap.get('gitlab')?.baseUrl ?? 'https://gitlab.example.com',
    token: '',
    accountLabel: connMap.get('gitlab')?.accountLabel ?? 'WorkBridge',
    projects:
      'group/project-a, group/project-b, group/project-c',
    groups: '',
    enabled: connMap.get('gitlab')?.enabled ?? false
  })
  const [clickup, setClickup] = useState({
    token: '',
    accountLabel: connMap.get('clickup')?.accountLabel ?? 'ClickUp',
    listIds: '123456789',
    equipeFieldId: '8a31b62e-66b6-4635-af86-061ac827469e',
    equipeValue: 'Team A',
    equipeOptionId: '19f59c9d-71ca-4037-a2fb-ff24a906e1a3',
    enabled: connMap.get('clickup')?.enabled ?? false
  })
  const [rocket, setRocket] = useState({
    baseUrl: connMap.get('rocketchat')?.baseUrl ?? '',
    token: '',
    userId: '',
    accountLabel: connMap.get('rocketchat')?.accountLabel ?? 'Rocket.Chat',
    rooms: '#app-review, #release',
    lookbackDays: 14,
    enabled: connMap.get('rocketchat')?.enabled ?? false
  })

  const [gitlabTest, setGitlabTest] = useState<TestState>({ status: 'idle' })
  const [clickupTest, setClickupTest] = useState<TestState>({ status: 'idle' })
  const [rocketTest, setRocketTest] = useState<TestState>({ status: 'idle' })

  const runTest = async (
    source: 'gitlab' | 'clickup' | 'rocketchat',
    payload: { baseUrl?: string; token?: string; userId?: string },
    setState: (state: TestState) => void
  ) => {
    setState({ status: 'testing' })
    const result = await testMutation.mutateAsync({ source, ...payload })
    if (result.ok) {
      setState({ status: 'success', message: 'Connection looks good.' })
    } else {
      setState({ status: 'error', message: result.message ?? 'Connection failed.' })
    }
  }

  const loadGitLabProjects = async () => {
    const result = await fetchGitLabProjects()
    if (result?.projects) setGitlabProjectOptions(result.projects)
  }

  const loadGitLabGroups = async () => {
    const result = await fetchGitLabGroups()
    if (result?.groups) setGitlabGroupOptions(result.groups)
  }

  const loadClickUpLists = async () => {
    const result = await fetchClickUpLists()
    if (result?.lists) setClickupListOptions(result.lists)
  }

  const loadEquipeOptions = async () => {
    const listId = clickup.listIds.split(',').map((entry) => entry.trim()).filter(Boolean)[0]
    if (!listId) return
    const result = await fetchClickUpEquipeOptions(listId)
    if (result?.options?.options) {
      setEquipeOptions(result.options.options)
    }
    if (result?.options?.fieldId) {
      setClickup((prev) => ({ ...prev, equipeFieldId: result.options.fieldId }))
    }
  }

  const loadRocketRooms = async () => {
    const result = await fetchRocketChatRooms()
    if (result?.rooms) setRocketRoomOptions(result.rooms)
  }

  const saveConnection = async (
    source: 'gitlab' | 'clickup' | 'rocketchat',
    payload: { baseUrl?: string; token?: string; accountLabel: string; scope?: string; enabled: boolean } | any,
    schema: z.ZodSchema
  ) => {
    const result = schema.safeParse(payload)
    if (!result.success) {
      return result.error.issues[0]?.message ?? 'Invalid fields.'
    }

    if (source === 'gitlab') {
      await connectionMutation.mutateAsync({
        source,
        baseUrl: payload.baseUrl ?? null,
        accountLabel: payload.accountLabel,
        scopeJson: JSON.stringify({
          projects: payload.projects
            ? payload.projects.split(',').map((entry) => entry.trim()).filter(Boolean)
            : [],
          groups: payload.groups
            ? payload.groups.split(',').map((entry) => entry.trim()).filter(Boolean)
            : []
        }),
        enabled: payload.enabled
      })
    } else if (source === 'clickup') {
      await connectionMutation.mutateAsync({
        source,
        baseUrl: null,
        accountLabel: payload.accountLabel,
        scopeJson: JSON.stringify({
          listIds: payload.listIds
            ? payload.listIds.split(',').map((entry: string) => entry.trim()).filter(Boolean)
            : [],
          equipeFieldId: payload.equipeFieldId ? payload.equipeFieldId.trim() : null,
          equipeValue: payload.equipeValue ? payload.equipeValue.trim() : null,
          equipeOptionId: payload.equipeOptionId ? payload.equipeOptionId.trim() : null
        }),
        enabled: payload.enabled
      })
    } else {
      await connectionMutation.mutateAsync({
        source,
        baseUrl: payload.baseUrl ?? null,
        accountLabel: payload.accountLabel,
        scopeJson: JSON.stringify({
          rooms: payload.rooms
            ? payload.rooms.split(',').map((entry: string) => entry.trim()).filter(Boolean)
            : [],
          lookbackDays: Number(payload.lookbackDays ?? 14),
          userId: payload.userId ? payload.userId.trim() : null
        }),
        enabled: payload.enabled
      })
    }

    if (payload.token) {
      await storeTokenMutation.mutateAsync({ source, token: payload.token })
    }

    return null
  }

  const [gitlabError, setGitlabError] = useState<string | null>(null)
  const [clickupError, setClickupError] = useState<string | null>(null)
  const [rocketError, setRocketError] = useState<string | null>(null)
  const [cadenceOpen, setCadenceOpen] = useState(false)
  const [cadenceMinutes, setCadenceMinutes] = useState(3)
  const [gitlabProjectOptions, setGitlabProjectOptions] = useState<string[]>([])
  const [gitlabGroupOptions, setGitlabGroupOptions] = useState<string[]>([])
  const [clickupListOptions, setClickupListOptions] = useState<Array<{ id: string; label: string }>>([])
  const [equipeOptions, setEquipeOptions] = useState<Array<{ id: string; name: string }>>([])
  const [rocketRoomOptions, setRocketRoomOptions] = useState<string[]>([])

  const appendToList = (current: string, value: string) => {
    const entries = current
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
    if (entries.includes(value)) return current
    return [...entries, value].join(', ')
  }

  useEffect(() => {
    if (cadence?.minutes) {
      setCadenceMinutes(cadence.minutes)
    }
  }, [cadence?.minutes])

  useEffect(() => {
    loadGitLabProjects()
    loadGitLabGroups()
    loadClickUpLists()
    loadEquipeOptions()
    loadRocketRooms()
  }, [])

  useEffect(() => {
    const gitlabConn = connMap.get('gitlab')
    const clickupConn = connMap.get('clickup')
    const rocketConn = connMap.get('rocketchat')

    if (gitlabConn) {
      const scope = gitlabConn.scopeJson ? JSON.parse(gitlabConn.scopeJson) : {}
      setGitlab((prev) => ({
        ...prev,
        baseUrl: gitlabConn.baseUrl ?? prev.baseUrl,
        accountLabel: gitlabConn.accountLabel ?? prev.accountLabel,
        projects: (scope.projects ?? []).join(', '),
        groups: (scope.groups ?? []).join(', '),
        enabled: gitlabConn.enabled
      }))
    }

    if (clickupConn) {
      const scope = clickupConn.scopeJson ? JSON.parse(clickupConn.scopeJson) : {}
      setClickup((prev) => ({
        ...prev,
        accountLabel: clickupConn.accountLabel ?? prev.accountLabel,
        listIds: (scope.listIds ?? []).join(', '),
        equipeFieldId: scope.equipeFieldId ?? prev.equipeFieldId,
        equipeValue: scope.equipeValue ?? prev.equipeValue,
        equipeOptionId: scope.equipeOptionId ?? prev.equipeOptionId,
        enabled: clickupConn.enabled
      }))
    }

    if (rocketConn) {
      const scope = rocketConn.scopeJson ? JSON.parse(rocketConn.scopeJson) : {}
      setRocket((prev) => ({
        ...prev,
        baseUrl: rocketConn.baseUrl ?? prev.baseUrl,
        accountLabel: rocketConn.accountLabel ?? prev.accountLabel,
        rooms: (scope.rooms ?? []).join(', '),
        lookbackDays: scope.lookbackDays ?? prev.lookbackDays,
        userId: scope.userId ?? prev.userId,
        enabled: rocketConn.enabled
      }))
    }
  }, [connMap])

  return (
    <>
    <div className="space-y-6">
      <div className="rounded-2xl border border-border/70 bg-card p-6">
        <h2 className="text-lg font-semibold">Settings</h2>
        <p className="text-sm text-muted-foreground">Configure integrations and sync behavior.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
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
                onChange={(event) => setGitlab((prev) => ({ ...prev, accountLabel: event.target.value }))}
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
                options={gitlabProjectOptions.map((project) => ({ value: project, label: project }))}
                placeholder="Pick project"
                disabled={!gitlabProjectOptions.length}
                onSelect={(option) =>
                  setGitlab((prev) => ({ ...prev, projects: appendToList(prev.projects, option.value) }))
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
                  setGitlab((prev) => ({ ...prev, groups: appendToList(prev.groups, option.value) }))
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
                onChange={(event) => setClickup((prev) => ({ ...prev, accountLabel: event.target.value }))}
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
                options={clickupListOptions.map((list) => ({ value: list.id, label: list.label }))}
                placeholder="Pick list"
                disabled={!clickupListOptions.length}
                onSelect={(option) =>
                  setClickup((prev) => ({ ...prev, listIds: appendToList(prev.listIds, option.value) }))
                }
              />
            </div>
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Equipe field ID</span>
              <input
                className="w-full rounded-lg border border-border bg-background px-3 py-2"
                value={clickup.equipeFieldId}
                onChange={(event) => setClickup((prev) => ({ ...prev, equipeFieldId: event.target.value }))}
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Equipe value</span>
              <input
                className="w-full rounded-lg border border-border bg-background px-3 py-2"
                value={clickup.equipeValue}
                onChange={(event) => setClickup((prev) => ({ ...prev, equipeValue: event.target.value }))}
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Equipe option ID</span>
              <input
                className="w-full rounded-lg border border-border bg-background px-3 py-2"
                value={clickup.equipeOptionId}
                onChange={(event) => setClickup((prev) => ({ ...prev, equipeOptionId: event.target.value }))}
              />
            </label>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Combobox
                options={equipeOptions.map((option) => ({ value: option.id, label: option.name }))}
                placeholder="Pick equipe"
                disabled={!equipeOptions.length}
                onSelect={(option) =>
                  setClickup((prev) => ({
                    ...prev,
                    equipeValue:
                      equipeOptions.find((entry) => entry.id === option.value)?.name ?? prev.equipeValue,
                    equipeOptionId: option.value
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
                onChange={(event) => setRocket((prev) => ({ ...prev, accountLabel: event.target.value }))}
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
                  setRocket((prev) => ({ ...prev, rooms: appendToList(prev.rooms, option.value) }))
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
                  setRocket((prev) => ({ ...prev, lookbackDays: Number(event.target.value || 1) }))
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

        <div className="rounded-2xl border border-border/70 bg-card p-6">
          <div className="text-sm font-semibold">Sync cadence</div>
          <div className="mt-2 text-sm text-muted-foreground">
            Polling every {cadence?.minutes ?? cadenceMinutes} minutes.
          </div>
          <Button variant="secondary" size="sm" className="mt-4" onClick={() => setCadenceOpen(true)}>
            Adjust schedule
          </Button>
        </div>

        <div className="rounded-2xl border border-rose-200/60 bg-rose-50/60 p-6 dark:border-rose-500/20 dark:bg-rose-500/10">
          <div className="text-sm font-semibold text-rose-600 dark:text-rose-300">Danger zone</div>
          <div className="mt-2 text-sm text-rose-700/80 dark:text-rose-200/80">
            This clears all local data, planner states, links, and stored tokens.
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-4 border-rose-300 text-rose-600 hover:bg-rose-100 dark:border-rose-500/40 dark:text-rose-200"
            onClick={() => {
              const confirm = window.confirm('This will delete all local data and tokens. Continue?')
              if (confirm) {
                flushMutation.mutate()
              }
            }}
          >
            Reset local data
          </Button>
        </div>
      </div>
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
            <span className="text-xs text-muted-foreground">Polling interval (1 - 60 minutes)</span>
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
