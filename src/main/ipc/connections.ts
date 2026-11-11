import { credentials as keytar } from '../credentials'
import { db } from '../db/db'
import { syncConnections } from '../db/schema'
import { testGitLabConnection } from '../integrations/gitlab'
import { SERVICE_NAME, type ConnectionPayload } from './auth'
import { handle } from './validate'
export function registerConnectionsHandlers() {
  handle('workbridge:get-connections', async () => {
    const rows = db.select().from(syncConnections).all()
    const withTokens = await Promise.all(
      rows.map(async (row) => ({
        ...row,
        hasToken: Boolean(await keytar.getPassword(SERVICE_NAME, row.source))
      }))
    )

    return withTokens
  })

  handle('workbridge:save-connection', (_event, payload: ConnectionPayload) => {
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

  handle('workbridge:store-token', async (_event, source: string, token: string) => {
    await keytar.setPassword(SERVICE_NAME, source, token)
    return { ok: true }
  })

  handle(
    'workbridge:test-connection',
    async (
      _event,
      payload: { source: string; baseUrl?: string; token?: string; userId?: string }
    ) => {
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
}
