import { createRequire } from 'node:module'
import { randomUUID } from 'node:crypto'
import { ipcMain, shell, Notification, BrowserWindow } from 'electron'
import { db } from './db/db'
import { sqlite } from './db/db'
import { externalItems, links, plannerState, syncConnections, syncCursors } from './db/schema'
import { and, eq } from 'drizzle-orm'
import {
  getSyncState,
  resetSyncState,
  syncClickUpNow,
  syncGitLabNow,
  syncRocketChatNow,
  getSyncCadence,
  setSyncCadence
} from './sync'
import {
  addGitLabMrNote,
  approveGitLabMr,
  listGitLabGroups,
  listGitLabMembers,
  listGitLabProjects,
  testGitLabConnection,
  unapproveGitLabMr,
  updateGitLabMrAssigneesReviewers,
  updateGitLabMrLabels
} from './integrations/gitlab'
import { addClickUpTaskComment, listClickUpEquipeOptions, listClickUpLists } from './integrations/clickup'
import { listRocketChatRooms, postRocketChatThreadReply, reactRocketChatMessage } from './integrations/rocketchat'

const SERVICE_NAME = 'WorkBridge'
const require = createRequire(import.meta.url)
const keytar = require('keytar') as typeof import('keytar')

export type PlannerUpdate = {
  itemId: string
  lane?: string
  priority?: string
  pinned?: boolean
  personalNote?: string
}

export type ConnectionPayload = {
  source: string
  baseUrl?: string | null
  accountLabel?: string | null
  scopeJson?: string | null
  enabled?: boolean
}

const getGitLabAuth = async () => {
  const connection = db.select().from(syncConnections).where(eq(syncConnections.source, 'gitlab')).get()
  if (!connection?.baseUrl) throw new Error('GitLab base URL missing.')
  const token = await keytar.getPassword(SERVICE_NAME, 'gitlab')
  if (!token) throw new Error('GitLab token missing.')
  return { baseUrl: connection.baseUrl, token }
}

const getClickUpAuth = async () => {
  const token = await keytar.getPassword(SERVICE_NAME, 'clickup')
  if (!token) throw new Error('ClickUp token missing.')
  return { token }
}

const getRocketChatAuth = async () => {
  const connection = db.select().from(syncConnections).where(eq(syncConnections.source, 'rocketchat')).get()
  if (!connection?.baseUrl) throw new Error('Rocket.Chat base URL missing.')
  const token = await keytar.getPassword(SERVICE_NAME, 'rocketchat')
  if (!token) throw new Error('Rocket.Chat token missing.')
  const scope = connection.scopeJson ? JSON.parse(connection.scopeJson) : {}
  const userId = scope.userId ?? null
  if (!userId) throw new Error('Rocket.Chat user id missing.')
  return { baseUrl: connection.baseUrl, token, userId }
}

export function registerIpc() {
  ipcMain.handle('workbridge:get-items', () => {
    return db.select().from(externalItems).all()
  })

  ipcMain.handle('workbridge:get-links', () => {
    return db.select().from(links).all()
  })

  ipcMain.handle('workbridge:get-planner', () => {
    return db.select().from(plannerState).all()
  })

  ipcMain.handle('workbridge:upsert-planner', (_event, payload: PlannerUpdate) => {
    const now = new Date().toISOString()
    const existing = db
      .select()
      .from(plannerState)
      .where(eq(plannerState.itemId, payload.itemId))
      .get()

    const next = {
      itemId: payload.itemId,
      lane: payload.lane ?? existing?.lane ?? 'inbox',
      priority: payload.priority ?? existing?.priority ?? 'P3',
      pinned: payload.pinned ?? existing?.pinned ?? false,
      personalNote: payload.personalNote ?? existing?.personalNote ?? null,
      plannedFor: existing?.plannedFor ?? null,
      updatedAt: now
    }

    db.insert(plannerState)
      .values({
        ...next
      })
      .onConflictDoUpdate({
        target: plannerState.itemId,
        set: {
          lane: next.lane,
          priority: next.priority,
          pinned: next.pinned,
          personalNote: next.personalNote,
          updatedAt: next.updatedAt
        }
      })
      .run()

    return { ok: true }
  })

  ipcMain.handle('workbridge:get-connections', async () => {
    const rows = db.select().from(syncConnections).all()
    const withTokens = await Promise.all(
      rows.map(async (row) => ({
        ...row,
        hasToken: Boolean(await keytar.getPassword(SERVICE_NAME, row.source))
      }))
    )

    return withTokens
  })

  ipcMain.handle('workbridge:save-connection', (_event, payload: ConnectionPayload) => {
    const id = `conn-${payload.source}`
    db.insert(syncConnections)
      .values({
        id,
        source: payload.source,
        baseUrl: payload.baseUrl ?? null,
        accountLabel: payload.accountLabel ?? null,
        scopeJson: payload.scopeJson ?? null,
        enabled: payload.enabled ?? false,
        lastSyncAt: null,
        lastError: null
      })
      .onConflictDoUpdate({
        target: syncConnections.id,
        set: {
          baseUrl: payload.baseUrl ?? null,
          accountLabel: payload.accountLabel ?? null,
          scopeJson: payload.scopeJson ?? null,
          enabled: payload.enabled ?? false
        }
      })
      .run()

    return { ok: true }
  })

  ipcMain.handle('workbridge:store-token', async (_event, source: string, token: string) => {
    await keytar.setPassword(SERVICE_NAME, source, token)
    return { ok: true }
  })

  ipcMain.handle(
    'workbridge:test-connection',
    async (_event, payload: { source: string; baseUrl?: string; token?: string; userId?: string }) => {
      try {
        if (payload.source === 'gitlab') {
          if (!payload.baseUrl || !payload.token) {
            return { ok: false, message: 'Base URL and token required.' }
          }
          await testGitLabConnection(payload.baseUrl, payload.token)
          return { ok: true }
        }

        if (payload.source === 'clickup') {
          if (!payload.token) {
            return { ok: false, message: 'Token required.' }
          }
          return { ok: true }
        }

        if (payload.source === 'rocketchat') {
          if (!payload.baseUrl || !payload.token || !payload.userId) {
            return { ok: false, message: 'Base URL, user id, and token required.' }
          }
          return { ok: true }
        }

        return { ok: false, message: 'Unknown source.' }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Connection failed.'
        return { ok: false, message }
      }
    }
  )

  ipcMain.handle('workbridge:test-notification', async () => {
    if (!Notification.isSupported()) {
      return { ok: false, message: 'Notifications are not supported on this system.' }
    }
    const notification = new Notification({
      title: 'WorkBridge',
      body: 'Notifications are working.',
      silent: false
    })
    notification.show()
    return { ok: true }
  })

  ipcMain.handle('workbridge:open-devtools', () => {
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
    if (!win) return { ok: false }
    win.webContents.openDevTools({ mode: 'detach' })
    return { ok: true }
  })

  ipcMain.handle('workbridge:list-gitlab-projects', async () => {
    try {
      const { baseUrl, token } = await getGitLabAuth()
      const projects = await listGitLabProjects(baseUrl, token)
      return { ok: true, projects }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load projects.'
      return { ok: false, message, projects: [] }
    }
  })

  ipcMain.handle('workbridge:list-gitlab-groups', async () => {
    try {
      const { baseUrl, token } = await getGitLabAuth()
      const groups = await listGitLabGroups(baseUrl, token)
      return { ok: true, groups }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load groups.'
      return { ok: false, message, groups: [] }
    }
  })

  ipcMain.handle('workbridge:list-gitlab-members', async (_event, projectId: number) => {
    try {
      const { baseUrl, token } = await getGitLabAuth()
      const members = await listGitLabMembers(baseUrl, token, projectId)
      return { ok: true, members }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load members.'
      return { ok: false, message, members: [] }
    }
  })

  ipcMain.handle('workbridge:list-clickup-lists', async () => {
    try {
      const { token } = await getClickUpAuth()
      const lists = await listClickUpLists(token)
      return { ok: true, lists }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load lists.'
      return { ok: false, message, lists: [] }
    }
  })

  ipcMain.handle('workbridge:list-clickup-equipe-options', async (_event, listId: string) => {
    try {
      const { token } = await getClickUpAuth()
      const options = await listClickUpEquipeOptions(token, listId)
      return { ok: true, options }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load equipe options.'
      return { ok: false, message, options: { fieldId: null, options: [] } }
    }
  })

  ipcMain.handle('workbridge:list-rocketchat-rooms', async () => {
    try {
      const { baseUrl, token, userId } = await getRocketChatAuth()
      const rooms = await listRocketChatRooms(baseUrl, token, userId)
      return { ok: true, rooms }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load rooms.'
      return { ok: false, message, rooms: [] }
    }
  })

  ipcMain.handle('workbridge:get-sync-status', () => {
    return getSyncState()
  })

  ipcMain.handle('workbridge:get-sync-cadence', () => {
    return { minutes: getSyncCadence() }
  })

  ipcMain.handle('workbridge:get-gitlab-diagnostics', () => {
    const gitlabItems = db.select().from(externalItems).where(eq(externalItems.source, 'gitlab')).all()
    const plannerRows = db.select().from(plannerState).all()
    const linkRows = db.select().from(links).all()
    const gitlabIds = new Set(gitlabItems.map((row) => row.id))

    const plannerForGitLabRows = plannerRows.filter((row) => gitlabIds.has(row.itemId))
    const orphanPlannerRows = plannerRows.filter((row) => row.itemId.startsWith('gl-mr-') && !gitlabIds.has(row.itemId))
    const linksTouchingGitLab = linkRows.filter(
      (row) => gitlabIds.has(row.fromItemId) || gitlabIds.has(row.toItemId)
    )

    const externalIdMap = new Map<string, string[]>()
    for (const row of gitlabItems) {
      const key = row.externalId
      const list = externalIdMap.get(key) ?? []
      list.push(row.id)
      externalIdMap.set(key, list)
    }

    const duplicateExternalIds = Array.from(externalIdMap.entries())
      .filter(([, ids]) => ids.length > 1)
      .map(([externalId, ids]) => ({ externalId, ids }))

    const connection = db.select().from(syncConnections).where(eq(syncConnections.source, 'gitlab')).get()
    const recentAudit = sqlite
      .prepare(
        `
        SELECT id, event_type as eventType, table_name as tableName, row_id as rowId, source, payload_json as payloadJson, created_at as createdAt
        FROM sync_audit_log
        WHERE source = 'gitlab'
        ORDER BY id DESC
        LIMIT 40
      `
      )
      .all() as Array<{
        id: number
        eventType: string
        tableName: string
        rowId: string
        source: string | null
        payloadJson: string | null
        createdAt: string
      }>

    return {
      gitlabItemCount: gitlabItems.length,
      gitlabPlannerCount: plannerForGitLabRows.length,
      gitlabLinkCount: linksTouchingGitLab.length,
      orphanPlannerCount: orphanPlannerRows.length,
      duplicateExternalIds,
      sampleIdentityMap: gitlabItems.slice(0, 20).map((row) => ({ id: row.id, externalId: row.externalId })),
      recentAudit,
      connection: connection
        ? {
            enabled: connection.enabled,
            lastSyncAt: connection.lastSyncAt,
            lastError: connection.lastError
          }
        : null
    }
  })

  ipcMain.handle('workbridge:set-sync-cadence', (_event, minutes: number) => {
    const value = setSyncCadence(minutes)
    return { minutes: value }
  })

  ipcMain.handle('workbridge:trigger-sync', async (_event, source: string) => {
    if (source === 'gitlab') {
      await syncGitLabNow({ full: true, trigger: 'manual' })
      return { ok: true }
    }
    if (source === 'clickup') {
      await syncClickUpNow()
      return { ok: true }
    }
    if (source === 'rocketchat') {
      await syncRocketChatNow()
      return { ok: true }
    }
    return { ok: false }
  })

  ipcMain.handle('workbridge:flush-all', async () => {
    db.delete(links).run()
    db.delete(plannerState).run()
    db.delete(externalItems).run()
    db.delete(syncCursors).run()
    db.delete(syncConnections).run()

    await Promise.all([
      keytar.deletePassword(SERVICE_NAME, 'gitlab'),
      keytar.deletePassword(SERVICE_NAME, 'clickup'),
      keytar.deletePassword(SERVICE_NAME, 'rocketchat')
    ])

    resetSyncState()
    return { ok: true }
  })

  ipcMain.handle('workbridge:open-external', async (_event, url: string) => {
    if (!url) return { ok: false }
    await shell.openExternal(url)
    return { ok: true }
  })

  ipcMain.handle(
    'workbridge:create-link',
    async (_event, payload: { fromId: string; toId: string; relationType: string; origin: 'manual' | 'auto'; suggested: boolean }) => {
      const existing = db
        .select()
        .from(links)
        .where(and(eq(links.fromItemId, payload.fromId), eq(links.toItemId, payload.toId)))
        .get()

      if (existing) return { ok: true }

      db.insert(links)
        .values({
          id: `lnk-${randomUUID()}`,
          fromItemId: payload.fromId,
          toItemId: payload.toId,
          relationType: payload.relationType,
          origin: payload.origin,
          confidence: payload.origin === 'auto' ? 70 : null,
          suggested: payload.suggested,
          createdAt: new Date().toISOString(),
          confirmedAt: payload.suggested ? null : new Date().toISOString()
        })
        .run()

      return { ok: true }
    }
  )

  ipcMain.handle('workbridge:confirm-link', async (_event, linkId: string) => {
    db.update(links)
      .set({ suggested: false, confirmedAt: new Date().toISOString() })
      .where(eq(links.id, linkId))
      .run()
    return { ok: true }
  })

  ipcMain.handle(
    'workbridge:gitlab-add-note',
    async (_event, payload: { projectId: number; iid: number; body: string }) => {
      const { baseUrl, token } = await getGitLabAuth()
      await addGitLabMrNote(baseUrl, token, payload.projectId, payload.iid, payload.body)
      await syncGitLabNow({ full: false, trigger: 'mutation' })
      return { ok: true }
    }
  )

  ipcMain.handle(
    'workbridge:clickup-add-comment',
    async (_event, payload: { taskId: string; body: string }) => {
      const { token } = await getClickUpAuth()
      await addClickUpTaskComment(token, payload.taskId, payload.body)
      await syncClickUpNow()
      return { ok: true }
    }
  )

  ipcMain.handle(
    'workbridge:rocketchat-thread-reply',
    async (_event, payload: { roomId: string; threadId: string; body: string }) => {
      const { baseUrl, token, userId } = await getRocketChatAuth()
      await postRocketChatThreadReply(baseUrl, token, userId, payload.roomId, payload.threadId, payload.body)
      await syncRocketChatNow()
      return { ok: true }
    }
  )

  ipcMain.handle(
    'workbridge:rocketchat-react',
    async (_event, payload: { messageId: string; emoji: string; shouldReact?: boolean }) => {
      const { baseUrl, token, userId } = await getRocketChatAuth()
      await reactRocketChatMessage(
        baseUrl,
        token,
        userId,
        payload.messageId,
        payload.emoji,
        payload.shouldReact ?? true
      )
      await syncRocketChatNow()
      return { ok: true }
    }
  )

  ipcMain.handle(
    'workbridge:gitlab-update-labels',
    async (_event, payload: { projectId: number; iid: number; labels: string[] }) => {
      const { baseUrl, token } = await getGitLabAuth()
      await updateGitLabMrLabels(baseUrl, token, payload.projectId, payload.iid, payload.labels)
      await syncGitLabNow({ full: false, trigger: 'mutation' })
      return { ok: true }
    }
  )

  ipcMain.handle(
    'workbridge:gitlab-update-reviewers',
    async (_event, payload: { projectId: number; iid: number; assignees: string[]; reviewers: string[] }) => {
      const { baseUrl, token } = await getGitLabAuth()
      await updateGitLabMrAssigneesReviewers(
        baseUrl,
        token,
        payload.projectId,
        payload.iid,
        payload.assignees,
        payload.reviewers
      )
      await syncGitLabNow({ full: false, trigger: 'mutation' })
      return { ok: true }
    }
  )

  ipcMain.handle(
    'workbridge:gitlab-approve',
    async (_event, payload: { projectId: number; iid: number }) => {
      const { baseUrl, token } = await getGitLabAuth()
      await approveGitLabMr(baseUrl, token, payload.projectId, payload.iid)
      await syncGitLabNow({ full: false, trigger: 'mutation' })
      return { ok: true }
    }
  )

  ipcMain.handle(
    'workbridge:gitlab-unapprove',
    async (_event, payload: { projectId: number; iid: number }) => {
      const { baseUrl, token } = await getGitLabAuth()
      await unapproveGitLabMr(baseUrl, token, payload.projectId, payload.iid)
      await syncGitLabNow({ full: false, trigger: 'mutation' })
      return { ok: true }
    }
  )

}
