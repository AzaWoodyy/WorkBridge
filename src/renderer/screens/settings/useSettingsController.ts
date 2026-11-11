import {
  fetchClickUpCustomFieldOptions,
  fetchClickUpLists,
  fetchGitLabGroups,
  fetchGitLabProjects,
  fetchRocketChatRooms
} from '@renderer/data/api'
import type { Connection } from '@renderer/data/types'
import {
  useConnectionMutation,
  useConnections,
  useFlushAllMutation,
  useStoreTokenMutation,
  useSyncCadence,
  useSyncCadenceMutation,
  useTestConnectionMutation
} from '@renderer/data/useDbData'
import { useEffect, useMemo, useState } from 'react'
import { z } from 'zod'
type TestState = { status: 'idle' | 'testing' | 'success' | 'error'; message?: string }

export function useSettingsController() {
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
    projects: 'group/project-a, group/project-b, group/project-c',
    groups: '',
    enabled: connMap.get('gitlab')?.enabled ?? false
  })
  const [clickup, setClickup] = useState({
    token: '',
    accountLabel: connMap.get('clickup')?.accountLabel ?? 'ClickUp',
    listIds: '',
    customFieldId: '',
    customFieldValue: '',
    customFieldOptionId: '',
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
    try {
      const result = await fetchGitLabProjects()
      if (result?.projects) setGitlabProjectOptions(result.projects)
    } catch {
      setGitlabProjectOptions([])
    }
  }

  const loadGitLabGroups = async () => {
    try {
      const result = await fetchGitLabGroups()
      if (result?.groups) setGitlabGroupOptions(result.groups)
    } catch {
      setGitlabGroupOptions([])
    }
  }

  const loadClickUpLists = async () => {
    try {
      const result = await fetchClickUpLists()
      if (result?.lists) setClickupListOptions(result.lists)
    } catch {
      setClickupListOptions([])
    }
  }

  const loadCustomFieldOptions = async () => {
    const listId = clickup.listIds
      .split(',')
      .map((entry: string) => entry.trim())
      .filter(Boolean)[0]
    if (!listId) return
    try {
      const result = await fetchClickUpCustomFieldOptions(listId, clickup.customFieldId)
      if (result?.options?.options) {
        setCustomFieldOptions(result.options.options)
      }
      if (result?.options?.fieldId) {
        setClickup((prev) => ({
          ...prev,
          customFieldId: result.options.fieldId ?? prev.customFieldId
        }))
      }
    } catch {
      setCustomFieldOptions([])
    }
  }

  const loadRocketRooms = async () => {
    try {
      const result = await fetchRocketChatRooms()
      if (result?.rooms) setRocketRoomOptions(result.rooms)
    } catch {
      setRocketRoomOptions([])
    }
  }

  const saveConnection = async (
    source: 'gitlab' | 'clickup' | 'rocketchat',
    payload:
      | { baseUrl?: string; token?: string; accountLabel: string; scope?: string; enabled: boolean }
      | any,
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
            ? payload.projects
                .split(',')
                .map((entry: string) => entry.trim())
                .filter(Boolean)
            : [],
          groups: payload.groups
            ? payload.groups
                .split(',')
                .map((entry: string) => entry.trim())
                .filter(Boolean)
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
            ? payload.listIds
                .split(',')
                .map((entry: string) => entry.trim())
                .filter(Boolean)
            : [],
          customFieldId: payload.customFieldId ? payload.customFieldId.trim() : null,
          customFieldValue: payload.customFieldValue ? payload.customFieldValue.trim() : null,
          customFieldOptionId: payload.customFieldOptionId
            ? payload.customFieldOptionId.trim()
            : null
        }),
        enabled: payload.enabled
      })
    } else if (source === 'rocketchat') {
      await connectionMutation.mutateAsync({
        source,
        baseUrl: payload.baseUrl ?? null,
        accountLabel: payload.accountLabel,
        scopeJson: JSON.stringify({
          rooms: payload.rooms
            ? payload.rooms
                .split(',')
                .map((entry: string) => entry.trim())
                .filter(Boolean)
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
  const [notificationTest, setNotificationTest] = useState<string | null>(null)
  const [gitlabProjectOptions, setGitlabProjectOptions] = useState<string[]>([])
  const [gitlabGroupOptions, setGitlabGroupOptions] = useState<string[]>([])
  const [clickupListOptions, setClickupListOptions] = useState<
    Array<{ id: string; label: string }>
  >([])
  const [customFieldOptions, setCustomFieldOptions] = useState<Array<{ id: string; name: string }>>(
    []
  )
  const [rocketRoomOptions, setRocketRoomOptions] = useState<string[]>([])

  const appendToList = (current: string, value: string) => {
    const entries = current
      .split(',')
      .map((entry: string) => entry.trim())
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
    if (connMap.get('gitlab')?.hasToken) {
      loadGitLabProjects()
      loadGitLabGroups()
    }
    if (connMap.get('clickup')?.hasToken) {
      loadClickUpLists()
      loadCustomFieldOptions()
    }
    if (connMap.get('rocketchat')?.hasToken) {
      loadRocketRooms()
    }
  }, [connMap])

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
        customFieldId: scope.customFieldId ?? scope.equipeFieldId ?? prev.customFieldId,
        customFieldValue: scope.customFieldValue ?? scope.equipeValue ?? prev.customFieldValue,
        customFieldOptionId:
          scope.customFieldOptionId ?? scope.equipeOptionId ?? prev.customFieldOptionId,
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

  return {
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
  }
}
