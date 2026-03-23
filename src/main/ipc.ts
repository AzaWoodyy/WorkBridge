import { createRequire } from 'node:module'
import { randomUUID } from 'node:crypto'
import { ipcMain, shell } from 'electron'
import { db } from './db/db'
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
  testGitLabConnection,
  unapproveGitLabMr,
  updateGitLabMrAssigneesReviewers,
  updateGitLabMrLabels
} from './integrations/gitlab'
import { addClickUpTaskComment } from './integrations/clickup'
import { postRocketChatThreadReply, reactRocketChatMessage } from './integrations/rocketchat'

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
    async (_event, payload: { source: string; baseUrl?: string; token?: string }) => {
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

  ipcMain.handle('workbridge:get-sync-status', () => {
    return getSyncState()
  })

  ipcMain.handle('workbridge:get-sync-cadence', () => {
    return { minutes: getSyncCadence() }
  })

  ipcMain.handle('workbridge:set-sync-cadence', (_event, minutes: number) => {
    const value = setSyncCadence(minutes)
    return { minutes: value }
  })

  ipcMain.handle('workbridge:trigger-sync', async (_event, source: string) => {
    if (source === 'gitlab') {
      await syncGitLabNow({ full: true })
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
      await syncGitLabNow({ full: false })
      return { ok: true }
    }
  )

  ipcMain.handle(
    'workbridge:clickup-add-comment',
    async (_event, payload: { taskId: string; body: string }) => {
      const { token } = await getClickUpAuth()
      await addClickUpTaskComment(token, payload.taskId, payload.body)
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
      await syncGitLabNow({ full: false })
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
      await syncGitLabNow({ full: false })
      return { ok: true }
    }
  )

  ipcMain.handle(
    'workbridge:gitlab-approve',
    async (_event, payload: { projectId: number; iid: number }) => {
      const { baseUrl, token } = await getGitLabAuth()
      await approveGitLabMr(baseUrl, token, payload.projectId, payload.iid)
      await syncGitLabNow({ full: false })
      return { ok: true }
    }
  )

  ipcMain.handle(
    'workbridge:gitlab-unapprove',
    async (_event, payload: { projectId: number; iid: number }) => {
      const { baseUrl, token } = await getGitLabAuth()
      await unapproveGitLabMr(baseUrl, token, payload.projectId, payload.iid)
      await syncGitLabNow({ full: false })
      return { ok: true }
    }
  )

}
