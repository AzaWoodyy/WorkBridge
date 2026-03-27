import { createRequire } from 'node:module'
import { db } from './db/db'
import { externalItems, plannerState, syncConnections, syncCursors } from './db/schema'
import { eq } from 'drizzle-orm'
import { syncGitLab } from './integrations/gitlab'
import { syncClickUp } from './integrations/clickup'
import { syncRocketChat } from './integrations/rocketchat'

const require = createRequire(import.meta.url)
const keytar = require('keytar') as typeof import('keytar')

type SyncState = {
  source: string
  status: 'idle' | 'syncing' | 'error'
  lastSyncAt?: string | null
  lastError?: string | null
}

export type GitLabSyncTrigger = 'startup' | 'poll' | 'manual' | 'mutation' | 'unknown'

const SERVICE_NAME = 'WorkBridge'
const DEFAULT_POLL_MINUTES = 3
let pollInterval: NodeJS.Timeout | null = null
let gitlabSyncInFlight: Promise<void> | null = null

const ensurePlannerRowsForSource = (source: 'gitlab' | 'clickup' | 'rocketchat') => {
  const now = new Date().toISOString()
  const rows = db.select().from(externalItems).where(eq(externalItems.source, source)).all()
  for (const row of rows) {
    db.insert(plannerState)
      .values({
        itemId: row.id,
        lane: 'inbox',
        priority: 'P3',
        pinned: false,
        personalNote: null,
        plannedFor: null,
        updatedAt: now
      })
      .onConflictDoNothing()
      .run()
  }
}

const getPollMinutes = () => {
  const row = db
    .select()
    .from(syncCursors)
    .where(eq(syncCursors.source, 'settings'))
    .where(eq(syncCursors.scopeKey, 'pollMinutes'))
    .get()
  const value = Number(row?.cursorValue)
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_POLL_MINUTES
}

export const setSyncCadence = (minutes: number) => {
  const safe = Math.max(1, Math.min(60, Math.floor(minutes)))
  db.delete(syncCursors)
    .where(eq(syncCursors.source, 'settings'))
    .where(eq(syncCursors.scopeKey, 'pollMinutes'))
    .run()
  db.insert(syncCursors)
    .values({
      source: 'settings',
      scopeKey: 'pollMinutes',
      cursorValue: String(safe),
      updatedAt: new Date().toISOString()
    })
    .run()
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
  scheduleSyncLoop()
  return safe
}

export const getSyncCadence = () => getPollMinutes()

const scheduleSyncLoop = () => {
  const minutes = getPollMinutes()
  pollInterval = setInterval(() => {
    syncGitLabNow({ full: false, trigger: 'poll' })
    syncClickUpNow()
    syncRocketChatNow()
  }, minutes * 60 * 1000)
}

const state: Record<string, SyncState> = {
  gitlab: { source: 'gitlab', status: 'idle', lastSyncAt: null, lastError: null },
  clickup: { source: 'clickup', status: 'idle', lastSyncAt: null, lastError: null },
  rocketchat: { source: 'rocketchat', status: 'idle', lastSyncAt: null, lastError: null }
}

const updateState = (source: string, partial: Partial<SyncState>) => {
  state[source] = { ...state[source], ...partial }
}

export const getSyncState = () => {
  const dbRows = db.select().from(syncConnections).all()
  return Object.values(state).map((entry) => {
    const dbRow = dbRows.find((row) => row.source === entry.source)
    return {
      ...entry,
      lastSyncAt: entry.lastSyncAt ?? dbRow?.lastSyncAt ?? null,
      lastError: entry.lastError ?? dbRow?.lastError ?? null
    }
  })
}

export const resetSyncState = () => {
  state.gitlab = { source: 'gitlab', status: 'idle', lastSyncAt: null, lastError: null }
  state.clickup = { source: 'clickup', status: 'idle', lastSyncAt: null, lastError: null }
  state.rocketchat = { source: 'rocketchat', status: 'idle', lastSyncAt: null, lastError: null }
}

const getGitLabConfig = async (full: boolean) => {
  const connection = db.select().from(syncConnections).where(eq(syncConnections.source, 'gitlab')).get()
  if (!connection) return { config: null, error: null }
  if (!connection.enabled) return { config: null, error: null }
  if (!connection.baseUrl) return { config: null, error: 'Missing base URL.' }
  const token = await keytar.getPassword(SERVICE_NAME, 'gitlab')
  if (!token) return { config: null, error: 'Missing token in Keychain.' }
  const scope = connection.scopeJson ? JSON.parse(connection.scopeJson) : {}
  const projects = scope.projects ?? scope.scope ?? []
  const groups = scope.groups ?? []
  if (projects.length === 0 && groups.length === 0) {
    return { config: null, error: 'Add at least one project or group.' }
  }
  const twoMonthsAgo = new Date()
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2)

  return {
    config: {
      baseUrl: connection.baseUrl,
      token,
      scope: {
        projects,
        groups
      },
      updatedAfter: full ? null : (connection.lastSyncAt ?? null),
      createdAfter: twoMonthsAgo.toISOString()
    },
    error: null
  }
}

export async function syncGitLabNow(options?: { full?: boolean; trigger?: GitLabSyncTrigger }) {
  if (gitlabSyncInFlight) {
    return gitlabSyncInFlight
  }

  gitlabSyncInFlight = (async () => {
  updateState('gitlab', { status: 'syncing', lastError: null })
  try {
    const hasItems = Boolean(
      db.select().from(externalItems).where(eq(externalItems.source, 'gitlab')).get()
    )
    const forceFull = Boolean(options?.full) || !hasItems
    const { config, error } = await getGitLabConfig(forceFull)
    if (!config) {
      if (error) {
        updateState('gitlab', { status: 'error', lastError: error })
        db.update(syncConnections)
          .set({ lastError: error })
          .where(eq(syncConnections.source, 'gitlab'))
          .run()
      } else {
        updateState('gitlab', { status: 'idle' })
      }
      return
    }
    const result = await syncGitLab(config)
    const finishedAt = new Date().toISOString()

    if (result.errors.length === 0) {
      // Advance cursor only on a clean sync to avoid skipping items after partial failures.
      db.update(syncConnections)
        .set({ lastSyncAt: finishedAt, lastError: null })
        .where(eq(syncConnections.source, 'gitlab'))
        .run()
      updateState('gitlab', {
        status: 'idle',
        lastSyncAt: finishedAt,
        lastError: null
      })
    } else {
      // Keep the previous cursor so a later retry can recover missing projects/MRs.
      db.update(syncConnections)
        .set({ lastError: result.errors[0] })
        .where(eq(syncConnections.source, 'gitlab'))
        .run()
      updateState('gitlab', {
        status: 'error',
        lastError: result.errors[0]
      })
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    updateState('gitlab', { status: 'error', lastError: message })
    db.update(syncConnections)
      .set({ lastError: message })
      .where(eq(syncConnections.source, 'gitlab'))
      .run()
  } finally {
    if (state.gitlab.status === 'syncing') {
      updateState('gitlab', { status: 'idle' })
    }
    gitlabSyncInFlight = null
  }
  })()

  return gitlabSyncInFlight
}

const getClickUpConfig = async () => {
  const connection = db.select().from(syncConnections).where(eq(syncConnections.source, 'clickup')).get()
  if (!connection) return { config: null, error: null }
  if (!connection.enabled) return { config: null, error: null }
  const token = await keytar.getPassword(SERVICE_NAME, 'clickup')
  if (!token) return { config: null, error: 'Missing token in Keychain.' }
  const scope = connection.scopeJson ? JSON.parse(connection.scopeJson) : {}
  const listIds = scope.listIds ?? scope.scope ?? []
  const teamId = scope.teamId ?? null
  const teamName = scope.teamName ?? null
  const equipeFieldId = scope.equipeFieldId ?? null
  const equipeValue = scope.equipeValue ?? null
  const equipeOptionId = scope.equipeOptionId ?? null
  if (!listIds.length) {
    return { config: null, error: 'Add at least one list id.' }
  }
  return { config: { token, listIds, teamId, teamName, equipeFieldId, equipeValue, equipeOptionId }, error: null }
}

const getRocketChatConfig = async () => {
  const connection = db.select().from(syncConnections).where(eq(syncConnections.source, 'rocketchat')).get()
  if (!connection) return { config: null, error: null }
  if (!connection.enabled) return { config: null, error: null }
  if (!connection.baseUrl) return { config: null, error: 'Rocket.Chat base URL missing.' }
  const token = await keytar.getPassword(SERVICE_NAME, 'rocketchat')
  if (!token) return { config: null, error: 'Missing token in Keychain.' }
  const scope = connection.scopeJson ? JSON.parse(connection.scopeJson) : {}
  const rooms = scope.rooms ?? scope.scope ?? []
  const lookbackDays = Number(scope.lookbackDays ?? 7)
  const userId = scope.userId ?? null
  if (!userId) return { config: null, error: 'Rocket.Chat user id required.' }
  if (!rooms.length) return { config: null, error: 'Add at least one room or channel.' }
  return { config: { baseUrl: connection.baseUrl, token, userId, rooms, lookbackDays }, error: null }
}

export async function syncClickUpNow() {
  updateState('clickup', { status: 'syncing', lastError: null })
  try {
    const { config, error } = await getClickUpConfig()
    if (!config) {
      if (error) {
        updateState('clickup', { status: 'error', lastError: error })
        db.update(syncConnections)
          .set({ lastError: error })
          .where(eq(syncConnections.source, 'clickup'))
          .run()
      } else {
        updateState('clickup', { status: 'idle' })
      }
      return
    }
    const result = await syncClickUp(config)
    updateState('clickup', {
      status: result.errors.length ? 'error' : 'idle',
      lastSyncAt: new Date().toISOString(),
      lastError: result.errors.length ? result.errors[0] : null
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    updateState('clickup', { status: 'error', lastError: message })
    db.update(syncConnections)
      .set({ lastError: message })
      .where(eq(syncConnections.source, 'clickup'))
      .run()
  } finally {
    if (state.clickup.status === 'syncing') {
      updateState('clickup', { status: 'idle' })
    }
  }
}

export async function syncRocketChatNow() {
  updateState('rocketchat', { status: 'syncing', lastError: null })
  try {
    const { config, error } = await getRocketChatConfig()
    if (!config) {
      if (error) {
        updateState('rocketchat', { status: 'error', lastError: error })
        db.update(syncConnections)
          .set({ lastError: error })
          .where(eq(syncConnections.source, 'rocketchat'))
          .run()
      } else {
        updateState('rocketchat', { status: 'idle' })
      }
      return
    }
    const result = await syncRocketChat(config)
    updateState('rocketchat', {
      status: result.errors.length ? 'error' : 'idle',
      lastSyncAt: new Date().toISOString(),
      lastError: result.errors.length ? result.errors[0] : null
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    updateState('rocketchat', { status: 'error', lastError: message })
    db.update(syncConnections)
      .set({ lastError: message })
      .where(eq(syncConnections.source, 'rocketchat'))
      .run()
  } finally {
    if (state.rocketchat.status === 'syncing') {
      updateState('rocketchat', { status: 'idle' })
    }
  }
}

export function startSyncLoop() {
  // Startup guardrail: persisted external items must remain visible before fresh sync completes.
  ensurePlannerRowsForSource('gitlab')
  ensurePlannerRowsForSource('clickup')
  ensurePlannerRowsForSource('rocketchat')
  syncGitLabNow({ full: false, trigger: 'startup' })
  syncClickUpNow()
  syncRocketChatNow()
  scheduleSyncLoop()
}
