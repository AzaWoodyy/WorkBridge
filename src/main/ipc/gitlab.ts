import { eq } from 'drizzle-orm'
import { db, sqlite } from '../db/db'
import { externalItems, links, plannerState, syncConnections } from '../db/schema'
import {
  addGitLabMrNote,
  approveGitLabMr,
  listGitLabGroups,
  listGitLabMembers,
  listGitLabProjects,
  unapproveGitLabMr,
  updateGitLabMrAssigneesReviewers,
  updateGitLabMrLabels
} from '../integrations/gitlab'
import { syncGitLabNow } from '../sync'
import { getGitLabAuth } from './auth'
import { handle } from './validate'
export function registerGitlabHandlers() {
  handle('workbridge:list-gitlab-projects', async () => {
    try {
      const { baseUrl, token } = await getGitLabAuth()
      const projects = await listGitLabProjects(baseUrl, token)
      return { ok: true, projects }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load projects.'
      return { ok: false, message, projects: [] }
    }
  })

  handle('workbridge:list-gitlab-groups', async () => {
    try {
      const { baseUrl, token } = await getGitLabAuth()
      const groups = await listGitLabGroups(baseUrl, token)
      return { ok: true, groups }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load groups.'
      return { ok: false, message, groups: [] }
    }
  })

  handle('workbridge:list-gitlab-members', async (_event, projectId: number) => {
    try {
      const { baseUrl, token } = await getGitLabAuth()
      const members = await listGitLabMembers(baseUrl, token, projectId)
      return { ok: true, members }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load members.'
      return { ok: false, message, members: [] }
    }
  })

  handle('workbridge:get-gitlab-diagnostics', () => {
    const gitlabItems = db
      .select()
      .from(externalItems)
      .where(eq(externalItems.source, 'gitlab'))
      .all()
    const plannerRows = db.select().from(plannerState).all()
    const linkRows = db.select().from(links).all()
    const gitlabIds = new Set(gitlabItems.map((row) => row.id))

    const plannerForGitLabRows = plannerRows.filter((row) => gitlabIds.has(row.itemId))
    const orphanPlannerRows = plannerRows.filter(
      (row) => row.itemId.startsWith('gl-mr-') && !gitlabIds.has(row.itemId)
    )
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

    const connection = db
      .select()
      .from(syncConnections)
      .where(eq(syncConnections.source, 'gitlab'))
      .get()
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
      sampleIdentityMap: gitlabItems
        .slice(0, 20)
        .map((row) => ({ id: row.id, externalId: row.externalId })),
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

  handle(
    'workbridge:gitlab-add-note',
    async (_event, payload: { projectId: number; iid: number; body: string }) => {
      const { baseUrl, token } = await getGitLabAuth()
      await addGitLabMrNote(baseUrl, token, payload.projectId, payload.iid, payload.body)
      await syncGitLabNow({ full: false, trigger: 'mutation' })
      return { ok: true }
    }
  )

  handle(
    'workbridge:gitlab-update-labels',
    async (_event, payload: { projectId: number; iid: number; labels: string[] }) => {
      const { baseUrl, token } = await getGitLabAuth()
      await updateGitLabMrLabels(baseUrl, token, payload.projectId, payload.iid, payload.labels)
      await syncGitLabNow({ full: false, trigger: 'mutation' })
      return { ok: true }
    }
  )

  handle(
    'workbridge:gitlab-update-reviewers',
    async (
      _event,
      payload: { projectId: number; iid: number; assignees: string[]; reviewers: string[] }
    ) => {
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

  handle(
    'workbridge:gitlab-approve',
    async (_event, payload: { projectId: number; iid: number }) => {
      const { baseUrl, token } = await getGitLabAuth()
      await approveGitLabMr(baseUrl, token, payload.projectId, payload.iid)
      await syncGitLabNow({ full: false, trigger: 'mutation' })
      return { ok: true }
    }
  )

  handle(
    'workbridge:gitlab-unapprove',
    async (_event, payload: { projectId: number; iid: number }) => {
      const { baseUrl, token } = await getGitLabAuth()
      await unapproveGitLabMr(baseUrl, token, payload.projectId, payload.iid)
      await syncGitLabNow({ full: false, trigger: 'mutation' })
      return { ok: true }
    }
  )
}
