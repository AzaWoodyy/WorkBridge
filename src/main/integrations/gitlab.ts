import { db } from '../db/db'
import { externalItems, plannerState, syncConnections, links } from '../db/schema'
import { eq, and, or } from 'drizzle-orm'
import { notifyOnce } from '../notifications'

export type GitLabScope = {
  projects?: string[]
  groups?: string[]
}

export type GitLabConnection = {
  baseUrl: string
  token: string
  scope: GitLabScope
}

type GitLabUser = {
  name: string
  username: string
}


type GitLabMergeRequest = {
  id: number
  iid: number
  project_id: number
  title: string
  description?: string | null
  state: string
  web_url: string
  draft?: boolean
  work_in_progress?: boolean
  updated_at: string
  created_at: string
  assignees?: GitLabUser[]
  reviewers?: GitLabUser[]
  labels?: string[]
  references?: { full: string }
  head_pipeline?: { status?: string }
  source_branch?: string
}

type ApprovalSummary = {
  approved: boolean
  approvalsRequired: number | null
  approvalsLeft: number | null
  approvedBy: string[]
}

const normalizeBaseUrl = (baseUrl: string) => baseUrl.replace(/\/$/, '')

const apiUrl = (baseUrl: string, path: string) => `${normalizeBaseUrl(baseUrl)}/api/v4${path}`

async function gitlabFetch<T>(baseUrl: string, token: string, path: string): Promise<{ data: T; headers: Headers }> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)

  const response = await fetch(apiUrl(baseUrl, path), {
    headers: {
      'PRIVATE-TOKEN': token
    },
    signal: controller.signal
  }).finally(() => clearTimeout(timeout))

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `GitLab request failed: ${response.status}`)
  }

  const data = (await response.json()) as T
  return { data, headers: response.headers }
}

async function gitlabRequest<T>(
  baseUrl: string,
  token: string,
  path: string,
  options: { method: 'POST' | 'PUT'; params?: Record<string, any> } 
): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)

  const params = new URLSearchParams()
  if (options.params) {
    for (const [key, value] of Object.entries(options.params)) {
      if (value === undefined || value === null) continue
      if (Array.isArray(value)) {
        value.forEach((entry) => params.append(`${key}[]`, String(entry)))
      } else {
        params.append(key, String(value))
      }
    }
  }

  const response = await fetch(apiUrl(baseUrl, path), {
    method: options.method,
    headers: {
      'PRIVATE-TOKEN': token,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params,
    signal: controller.signal
  }).finally(() => clearTimeout(timeout))

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `GitLab request failed: ${response.status}`)
  }

  return (await response.json()) as T
}

async function resolveUserId(baseUrl: string, token: string, username: string): Promise<number | null> {
  try {
    const { data } = await gitlabFetch<any[]>(
      baseUrl,
      token,
      `/users?username=${encodeURIComponent(username)}`
    )
    if (!data?.length) return null
    return data[0].id ?? null
  } catch (error) {
    return null
  }
}

async function resolveUserIds(baseUrl: string, token: string, usernames: string[]) {
  const ids: number[] = []
  for (const username of usernames) {
    const id = await resolveUserId(baseUrl, token, username)
    if (id) ids.push(id)
  }
  return ids
}

async function fetchPaginated<T>(baseUrl: string, token: string, path: string): Promise<T[]> {
  const results: T[] = []
  let page = 1

  while (true) {
    const { data, headers } = await gitlabFetch<T[]>(baseUrl, token, `${path}&per_page=50&page=${page}`)
    results.push(...data)
    const nextPage = headers.get('x-next-page')
    if (!nextPage) break
    page = Number(nextPage)
    if (!page) break
  }

  return results
}


async function fetchApprovals(baseUrl: string, token: string, projectId: number, iid: number): Promise<ApprovalSummary | null> {
  try {
    const { data } = await gitlabFetch<any>(
      baseUrl,
      token,
      `/projects/${projectId}/merge_requests/${iid}/approvals`
    )

    const approvedBy = Array.isArray(data.approved_by)
      ? data.approved_by.map((entry: any) => entry?.user?.name ?? entry?.user?.username).filter(Boolean)
      : []

    return {
      approved: Boolean(data.approved),
      approvalsRequired: typeof data.approvals_required === 'number' ? data.approvals_required : null,
      approvalsLeft: typeof data.approvals_left === 'number' ? data.approvals_left : null,
      approvedBy
    }
  } catch (error) {
    return null
  }
}

async function fetchPipelineStatus(baseUrl: string, token: string, projectId: number, iid: number, fallback?: string) {
  if (fallback) return fallback
  try {
    const { data } = await gitlabFetch<any[]>(
      baseUrl,
      token,
      `/projects/${projectId}/merge_requests/${iid}/pipelines?per_page=1&page=1`
    )
    const pipeline = data?.[0]
    return pipeline?.status ?? null
  } catch (error) {
    return null
  }
}

async function fetchMergeRequestState(baseUrl: string, token: string, projectId: number, iid: number) {
  try {
    const { data } = await gitlabFetch<any>(baseUrl, token, `/projects/${projectId}/merge_requests/${iid}`)
    return data?.state ?? null
  } catch (error) {
    return null
  }
}

const hasLinks = (itemId: string) => {
  const link = db
    .select()
    .from(links)
    .where(or(eq(links.fromItemId, itemId), eq(links.toItemId, itemId)))
    .get()
  return Boolean(link)
}

async function withConcurrency<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = []
  let index = 0

  const runners = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
    while (index < items.length) {
      const current = items[index++]
      results.push(await worker(current))
    }
  })

  await Promise.all(runners)
  return results
}

export async function testGitLabConnection(baseUrl: string, token: string) {
  const { data } = await gitlabFetch<any>(baseUrl, token, '/user')
  return data
}

export async function syncGitLab(connection: GitLabConnection & { updatedAfter?: string | null; createdAfter?: string | null }) {
  const { baseUrl, token, scope } = connection
  const projectIds = scope.projects ?? []
  const groupIds = scope.groups ?? []

  const mrLists: GitLabMergeRequest[] = []
  const errors: string[] = []
  const updatedAfter = connection.updatedAfter ? `&updated_after=${encodeURIComponent(connection.updatedAfter)}` : ''
  const createdAfter = connection.createdAfter ? `&created_after=${encodeURIComponent(connection.createdAfter)}` : ''

  for (const project of projectIds) {
    const encoded = encodeURIComponent(project)
    try {
      const list = await fetchPaginated<GitLabMergeRequest>(
        baseUrl,
        token,
        `/projects/${encoded}/merge_requests?state=opened&scope=all&order_by=updated_at&sort=desc${updatedAfter}${createdAfter}`
      )
      mrLists.push(...list)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      errors.push(`Project ${project}: ${message}`)
    }
  }

  for (const group of groupIds) {
    const encoded = encodeURIComponent(group)
    try {
      const list = await fetchPaginated<GitLabMergeRequest>(
        baseUrl,
        token,
        `/groups/${encoded}/merge_requests?state=opened&include_subgroups=true&order_by=updated_at&sort=desc${updatedAfter}${createdAfter}`
      )
      mrLists.push(...list)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      errors.push(`Group ${group}: ${message}`)
    }
  }

  const now = new Date().toISOString()
  const seen = new Set<string>()

  await withConcurrency(mrLists, 6, async (mr) => {
    const key = `${mr.project_id}-${mr.iid}`
    if (seen.has(key)) return
    seen.add(key)
    const isDraft = Boolean(mr.draft ?? mr.work_in_progress ?? mr.title?.startsWith('Draft:'))
    const reviewers = mr.reviewers?.map((user) => user.name ?? user.username).filter(Boolean) ?? []
    const assignees = mr.assignees?.map((user) => user.name ?? user.username).filter(Boolean) ?? []

    const [approvals, pipelineStatus] = await Promise.all([
      fetchApprovals(baseUrl, token, mr.project_id, mr.iid),
      fetchPipelineStatus(baseUrl, token, mr.project_id, mr.iid, mr.head_pipeline?.status)
    ])

    const meta = {
      iid: mr.iid,
      projectId: mr.project_id,
      draft: isDraft,
      reviewers,
      assignees,
      labels: mr.labels ?? [],
      approvals,
      pipelineStatus,
      state: mr.state,
      updatedAt: mr.updated_at,
      sourceBranch: mr.source_branch ?? null
    }

    const projectName = mr.references?.full?.split('!')[0] ?? `Project ${mr.project_id}`
    const itemId = `gl-mr-${mr.project_id}-${mr.iid}`
    const existing = db.select().from(externalItems).where(eq(externalItems.id, itemId)).get()
    const prevMeta = existing?.rawJson ? JSON.parse(existing.rawJson) : null

    db.insert(externalItems)
      .values({
        id: itemId,
        source: 'gitlab',
        externalId: `${mr.project_id}-${mr.iid}`,
        itemType: 'merge_request',
        title: mr.title,
        bodySnippet: mr.description ?? '',
        url: mr.web_url,
        status: mr.state,
        projectOrRoomName: projectName,
        assigneeSummary: assignees.join(', '),
        dueAt: null,
        updatedAt: mr.updated_at,
        rawJson: JSON.stringify(meta),
        createdAt: mr.created_at ?? now
      })
      .onConflictDoUpdate({
        target: externalItems.id,
        set: {
          title: mr.title,
          bodySnippet: mr.description ?? '',
          status: mr.state,
          projectOrRoomName: projectName,
          assigneeSummary: assignees.join(', '),
          updatedAt: mr.updated_at,
          rawJson: JSON.stringify(meta)
        }
      })
      .run()

    if (pipelineStatus === 'failed' && prevMeta?.pipelineStatus !== 'failed' && hasLinks(itemId)) {
      notifyOnce(`gl-pipeline-failed-${itemId}-${mr.updated_at}`, 'Pipeline failed', mr.title)
    }

    // Ensure GitLab MRs appear in Inbox unless user already set a lane
    db.insert(plannerState)
      .values({
        itemId,
        lane: 'inbox',
        priority: 'P3',
        pinned: false,
        personalNote: null,
        plannedFor: null,
        updatedAt: now
      })
      .onConflictDoNothing()
      .run()

    const haystack = `${mr.title}\\n${mr.description ?? ''}\\n${mr.source_branch ?? ''}`
    suggestLinksForMr(itemId, haystack)
  })

  const connectionId = 'conn-gitlab'
  db.update(syncConnections)
    .set({ lastSyncAt: now, lastError: errors.length ? errors[0] : null })
    .where(eq(syncConnections.id, connectionId))
    .run()

  const existingGitlab = db
    .select()
    .from(externalItems)
    .where(eq(externalItems.source, 'gitlab'))
    .all()
  for (const row of existingGitlab) {
    if (seen.has(row.externalId)) continue
    const meta = row.rawJson ? JSON.parse(row.rawJson) : null
    const projectId = meta?.projectId
    const iid = meta?.iid
    if (projectId && iid && hasLinks(row.id)) {
      const state = await fetchMergeRequestState(baseUrl, token, projectId, iid)
      if (state === 'merged') {
        notifyOnce(`gl-merged-${row.id}`, 'MR merged', row.title)
      }
    }
    db.delete(externalItems).where(eq(externalItems.id, row.id)).run()
    db.delete(plannerState).where(eq(plannerState.itemId, row.id)).run()
  }

  return { synced: mrLists.length, errors }
}

function extractClickUpIds(text: string): string[] {
  const ids = new Set<string>()
  const urlRegex = /https?:\/\/app\.clickup\.com\/t\/([a-z0-9]+)/gi
  const idRegex = /\bCU-([a-z0-9]+)\b/gi

  let match
  while ((match = urlRegex.exec(text))) {
    ids.add(match[1])
  }
  while ((match = idRegex.exec(text))) {
    ids.add(match[1])
  }
  return Array.from(ids)
}

function suggestLinksForMr(mrItemId: string, text: string) {
  const ids = extractClickUpIds(text)
  if (!ids.length) return

  const clickupItems = db
    .select()
    .from(externalItems)
    .where(eq(externalItems.source, 'clickup'))
    .all()

  const idToItem = new Map(clickupItems.map((item) => [item.externalId, item.id]))

  for (const id of ids) {
    const targetId = idToItem.get(id)
    if (!targetId) continue

    const existing = db
      .select()
      .from(links)
      .where(
        or(
          and(eq(links.fromItemId, mrItemId), eq(links.toItemId, targetId)),
          and(eq(links.fromItemId, targetId), eq(links.toItemId, mrItemId))
        )
      )
      .get()

    if (existing) continue

    db.insert(links)
      .values({
        id: `lnk-${mrItemId}-${targetId}`,
        fromItemId: mrItemId,
        toItemId: targetId,
        relationType: 'relates_to',
        origin: 'auto',
        confidence: 80,
        suggested: true,
        createdAt: new Date().toISOString(),
        confirmedAt: null
      })
      .run()
  }
}

export async function addGitLabMrNote(baseUrl: string, token: string, projectId: number, iid: number, body: string) {
  return gitlabRequest(baseUrl, token, `/projects/${projectId}/merge_requests/${iid}/notes`, {
    method: 'POST',
    params: { body }
  })
}

export async function updateGitLabMrLabels(baseUrl: string, token: string, projectId: number, iid: number, labels: string[]) {
  return gitlabRequest(baseUrl, token, `/projects/${projectId}/merge_requests/${iid}`, {
    method: 'PUT',
    params: { labels: labels.join(',') }
  })
}

export async function updateGitLabMrAssigneesReviewers(
  baseUrl: string,
  token: string,
  projectId: number,
  iid: number,
  assignees: string[],
  reviewers: string[]
) {
  const assigneeIds = await resolveUserIds(baseUrl, token, assignees)
  const reviewerIds = await resolveUserIds(baseUrl, token, reviewers)

  return gitlabRequest(baseUrl, token, `/projects/${projectId}/merge_requests/${iid}`, {
    method: 'PUT',
    params: {
      assignee_ids: assignees.length ? assigneeIds : [0],
      reviewer_ids: reviewers.length ? reviewerIds : [0]
    }
  })
}

export async function approveGitLabMr(baseUrl: string, token: string, projectId: number, iid: number) {
  return gitlabRequest(baseUrl, token, `/projects/${projectId}/merge_requests/${iid}/approve`, {
    method: 'POST'
  })
}

export async function unapproveGitLabMr(baseUrl: string, token: string, projectId: number, iid: number) {
  return gitlabRequest(baseUrl, token, `/projects/${projectId}/merge_requests/${iid}/unapprove`, {
    method: 'POST'
  })
}
