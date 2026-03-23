import type { Connection, DbExternalItem, Link, PlannerState, SyncStatus, WorkItem } from './types'

export async function fetchItems(): Promise<WorkItem[]> {
  const rows = (await window.workbridge.getItems()) as DbExternalItem[]
  return rows.map((row) => {
    const meta = row.rawJson ? JSON.parse(row.rawJson) : undefined
    const normalizedDue =
      row.dueAt && /^[0-9]+$/.test(row.dueAt) ? new Date(Number(row.dueAt)).toISOString() : row.dueAt ?? undefined
    const needsReview =
      row.itemType === 'message'
        ? Boolean(meta?.reviewRequest ?? row.title.toLowerCase().includes('review'))
        : row.source === 'gitlab'
        ? meta?.state === 'opened' && !meta?.draft && !(meta?.approvals?.approved ?? false)
        : false

    return {
    id: row.id,
    source: row.source,
    itemType: row.itemType,
    title: row.title,
    snippet: row.bodySnippet ?? '',
    url: row.url,
    status: row.status,
    projectOrRoom: row.projectOrRoomName ?? '',
    assignees: row.assigneeSummary ? row.assigneeSummary.split(',').map((entry) => entry.trim()) : [],
    dueAt: normalizedDue,
    updatedAt: row.updatedAt,
    needsReview,
    meta
  }
  })
}

export async function fetchPlanner(): Promise<PlannerState[]> {
  return window.workbridge.getPlanner() as Promise<PlannerState[]>
}

export async function fetchLinks(): Promise<Link[]> {
  return window.workbridge.getLinks() as Promise<Link[]>
}

export async function upsertPlannerState(payload: {
  itemId: string
  lane?: string
  priority?: string
  pinned?: boolean
  personalNote?: string | null
}) {
  return window.workbridge.upsertPlanner(payload)
}

export async function fetchConnections(): Promise<Connection[]> {
  return window.workbridge.getConnections() as Promise<Connection[]>
}

export async function saveConnection(payload: {
  source: string
  baseUrl?: string | null
  accountLabel?: string | null
  scopeJson?: string | null
  enabled?: boolean
}) {
  return window.workbridge.saveConnection(payload)
}

export async function storeToken(source: string, token: string) {
  return window.workbridge.storeToken(source, token)
}

export async function testConnection(payload: { source: string; baseUrl?: string; token?: string; userId?: string }) {
  return window.workbridge.testConnection(payload)
}

export async function fetchGitLabProjects() {
  return window.workbridge.listGitLabProjects()
}

export async function fetchGitLabGroups() {
  return window.workbridge.listGitLabGroups()
}

export async function fetchClickUpLists() {
  return window.workbridge.listClickUpLists()
}

export async function fetchClickUpEquipeOptions(listId: string) {
  return window.workbridge.listClickUpEquipeOptions(listId)
}

export async function fetchRocketChatRooms() {
  return window.workbridge.listRocketChatRooms()
}

export async function fetchSyncStatus(): Promise<SyncStatus[]> {
  return window.workbridge.getSyncStatus() as Promise<SyncStatus[]>
}

export async function fetchSyncCadence(): Promise<{ minutes: number }> {
  return window.workbridge.getSyncCadence()
}

export async function updateSyncCadence(minutes: number): Promise<{ minutes: number }> {
  return window.workbridge.setSyncCadence(minutes)
}

export async function triggerSync(source: string) {
  return window.workbridge.triggerSync(source)
}

export async function flushAll() {
  return window.workbridge.flushAll()
}

export async function gitlabAddNote(payload: { projectId: number; iid: number; body: string }) {
  return window.workbridge.gitlabAddNote(payload)
}

export async function clickupAddComment(payload: { taskId: string; body: string }) {
  return window.workbridge.clickupAddComment(payload)
}

export async function rocketChatThreadReply(payload: { roomId: string; threadId: string; body: string }) {
  return window.workbridge.rocketChatThreadReply(payload)
}

export async function rocketChatReact(payload: { messageId: string; emoji: string; shouldReact?: boolean }) {
  return window.workbridge.rocketChatReact(payload)
}

export async function gitlabUpdateLabels(payload: { projectId: number; iid: number; labels: string[] }) {
  return window.workbridge.gitlabUpdateLabels(payload)
}

export async function gitlabUpdateReviewers(payload: { projectId: number; iid: number; assignees: string[]; reviewers: string[] }) {
  return window.workbridge.gitlabUpdateReviewers(payload)
}

export async function gitlabApprove(payload: { projectId: number; iid: number }) {
  return window.workbridge.gitlabApprove(payload)
}

export async function gitlabUnapprove(payload: { projectId: number; iid: number }) {
  return window.workbridge.gitlabUnapprove(payload)
}

export async function createLink(payload: { fromId: string; toId: string; relationType: string; origin: 'manual' | 'auto'; suggested: boolean }) {
  return window.workbridge.createLink(payload)
}

export async function confirmLink(linkId: string) {
  return window.workbridge.confirmLink(linkId)
}
