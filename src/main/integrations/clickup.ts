import { db } from '../db/db'
import { externalItems, links, plannerState, syncConnections } from '../db/schema'
import { and, eq, or } from 'drizzle-orm'
import { notifyOnce } from '../notifications'

export type ClickUpConnection = {
  token: string
  listIds: string[]
  teamId?: string | null
  teamName?: string | null
  equipeFieldId?: string | null
  equipeValue?: string | null
  equipeOptionId?: string | null
}

type ClickUpUser = {
  id: number
  username: string
  email?: string
  profilePicture?: string
}

type ClickUpTask = {
  id: string
  name: string
  description?: string | null
  status?: { status: string }
  assignees?: ClickUpUser[]
  url: string
  due_date?: string | null
  priority?: { priority: string; orderindex: string } | null
  list?: { id: string; name: string }
  list_ids?: string[]
  folder?: { id: string; name: string }
  space?: { id: string; name: string }
  date_updated?: string
  date_created?: string
  custom_fields?: Array<{
    id: string
    name: string
    value?: string | number | null
    type?: string
    type_config?: { options?: Array<{ id: string; name: string }> }
  }>
}

type ClickUpTeam = { id: string; name: string }
type ClickUpSpace = { id: string; name: string }
type ClickUpFolder = { id: string; name: string }
type ClickUpList = { id: string; name: string }

const CLICKUP_API = 'https://api.clickup.com/api/v2'

async function clickupFetch<T>(token: string, path: string): Promise<T> {
  const response = await fetch(`${CLICKUP_API}${path}`, {
    headers: {
      Authorization: token
    }
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `ClickUp request failed: ${response.status}`)
  }

  return (await response.json()) as T
}

export async function listClickUpLists(token: string) {
  const results: Array<{ id: string; label: string }> = []
  const teams = await clickupFetch<{ teams: ClickUpTeam[] }>(token, '/team')

  for (const team of teams.teams ?? []) {
    const spaces = await clickupFetch<{ spaces: ClickUpSpace[] }>(
      token,
      `/team/${team.id}/space?archived=false`
    )
    for (const space of spaces.spaces ?? []) {
      const lists = await clickupFetch<{ lists: ClickUpList[] }>(
        token,
        `/space/${space.id}/list?archived=false`
      )
      for (const list of lists.lists ?? []) {
        results.push({ id: list.id, label: `${team.name} / ${space.name} / ${list.name}` })
      }

      const folders = await clickupFetch<{ folders: ClickUpFolder[] }>(
        token,
        `/space/${space.id}/folder?archived=false`
      )
      for (const folder of folders.folders ?? []) {
        const folderLists = await clickupFetch<{ lists: ClickUpList[] }>(
          token,
          `/folder/${folder.id}/list?archived=false`
        )
        for (const list of folderLists.lists ?? []) {
          results.push({ id: list.id, label: `${team.name} / ${space.name} / ${folder.name} / ${list.name}` })
        }
      }
    }
  }

  return results
}

export async function listClickUpEquipeOptions(token: string, listId: string) {
  const data = await clickupFetch<{ fields: ClickUpTask['custom_fields'] }>(token, `/list/${listId}/field`)
  const fields = data.fields ?? []
  const equipeField =
    fields.find((field) => field.name?.toLowerCase() === 'equipe') ??
    fields.find((field) => field.type === 'drop_down')
  if (!equipeField || !equipeField.type_config?.options) {
    return { fieldId: equipeField?.id ?? null, options: [] }
  }
  return {
    fieldId: equipeField.id,
    options: equipeField.type_config.options.map((option) => ({
      id: option.id,
      name: option.name
    }))
  }
}

async function clickupPost<T>(token: string, path: string, body: unknown): Promise<T> {
  const response = await fetch(`${CLICKUP_API}${path}`, {
    method: 'POST',
    headers: {
      Authorization: token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `ClickUp request failed: ${response.status}`)
  }

  return (await response.json()) as T
}

function buildCustomFieldFilter(fieldId?: string | null, optionId?: string | null) {
  if (!fieldId || !optionId) return null
  const payload = [
    {
      field_id: fieldId,
      operator: '=',
      value: optionId
    }
  ]
  return encodeURIComponent(JSON.stringify(payload))
}

const CLICKUP_STATUS_FILTERS = ['en cours', 'ouvert', 'en validation']

async function fetchTasksForList(token: string, listId: string, customFields?: string | null) {
  const tasks: ClickUpTask[] = []
  let page = 0

  while (true) {
    const custom = customFields ? `&custom_fields=${customFields}` : ''
    const data = await clickupFetch<{ tasks: ClickUpTask[] }>(
      token,
      `/list/${listId}/task?page=${page}&include_closed=true&include_subtasks=true&include_timl=true${custom}`
    )
    tasks.push(...(data.tasks ?? []))
    if (!data.tasks || data.tasks.length < 100) break
    page += 1
  }

  return tasks
}

async function fetchTasksForTeam(token: string, teamId: string, listIds: string[], customFields?: string | null) {
  const tasks: ClickUpTask[] = []
  let page = 0

  const listParams = listIds.map((id) => `list_ids[]=${encodeURIComponent(id)}`).join('&')

  while (true) {
    const custom = customFields ? `&custom_fields=${customFields}` : ''
    const data = await clickupFetch<{ tasks: ClickUpTask[] }>(
      token,
      `/team/${teamId}/task?page=${page}&include_closed=true&include_subtasks=true&include_timl=true&${listParams}${custom}`
    )
    tasks.push(...(data.tasks ?? []))
    if (!data.tasks || data.tasks.length < 100) break
    page += 1
  }

  return tasks
}

const normalizeStatus = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\\u0300-\\u036f]/g, '')
    .toLowerCase()
    .trim()

const allowedStatuses = new Set(CLICKUP_STATUS_FILTERS.map((status) => normalizeStatus(status)))

const normalizeName = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\\u0300-\\u036f]/g, '')
    .toLowerCase()
    .trim()

async function resolveTeamId(token: string, teamName: string): Promise<string | null> {
  try {
    const data = await clickupFetch<{ teams: { id: string; name: string }[] }>(token, '/team')
    const target = normalizeName(teamName)
    const match = data.teams?.find((team) => normalizeName(team.name) === target)
    return match?.id ?? null
  } catch (error) {
    return null
  }
}

const isDueToday = (dueAt?: string | null) => {
  if (!dueAt) return false
  const dueDate = /^[0-9]+$/.test(dueAt) ? new Date(Number(dueAt)) : new Date(dueAt)
  if (Number.isNaN(dueDate.getTime())) return false
  const now = new Date()
  return (
    dueDate.getFullYear() === now.getFullYear() &&
    dueDate.getMonth() === now.getMonth() &&
    dueDate.getDate() === now.getDate()
  )
}

export async function syncClickUp(connection: ClickUpConnection) {
  const { token, listIds, teamId, teamName, equipeFieldId, equipeValue, equipeOptionId } = connection
  const tasks: ClickUpTask[] = []
  const errors: string[] = []
  const statusCounts = new Map<string, number>()

  let resolvedTeamId = teamId ?? null
  let resolvedTeamName = teamName ?? null
  if (!resolvedTeamId && teamName) {
    resolvedTeamId = await resolveTeamId(token, teamName)
    if (!resolvedTeamId) {
      errors.push(`Team name \"${teamName}\" not found.`)
    } else {
      resolvedTeamName = teamName
    }
  }

  const customFields = buildCustomFieldFilter(equipeFieldId, equipeOptionId)

  if (resolvedTeamId) {
    try {
      const teamTasks = await fetchTasksForTeam(token, resolvedTeamId, listIds, customFields)
      tasks.push(...teamTasks)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      errors.push(`Team ${resolvedTeamId}: ${message}`)
    }
  } else {
    for (const listId of listIds) {
      try {
        const listTasks = await fetchTasksForList(token, listId, customFields)
        tasks.push(...listTasks)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        errors.push(`List ${listId}: ${message}`)
      }
    }
  }

  const now = new Date().toISOString()
  let keptCount = 0
  const seenIds = new Set<string>()

  const enforceListMatch = Boolean(resolvedTeamId)

  for (const task of tasks) {
    const statusName = task.status?.status ?? ''
    const normalizedStatus = normalizeStatus(statusName)
    if (statusName) {
      statusCounts.set(statusName, (statusCounts.get(statusName) ?? 0) + 1)
    }
    const itemId = `cu-task-${task.id}`
    seenIds.add(itemId)
    const listMatch = !enforceListMatch
      ? true
      : listIds.length
        ? listIds.some(
            (id) => id === task.list?.id || (Array.isArray(task.list_ids) && task.list_ids.includes(id))
          )
        : true

    if (!listMatch || !allowedStatuses.has(normalizedStatus)) {
      db.delete(externalItems).where(eq(externalItems.id, itemId)).run()
      db.delete(plannerState).where(eq(plannerState.itemId, itemId)).run()
      continue
    }
    keptCount += 1

    const assignees = task.assignees?.map((user) => user.username).filter(Boolean) ?? []
    const locationParts = [task.space?.name, task.folder?.name, task.list?.name].filter(Boolean)
    const projectOrRoomName = locationParts.join(' / ')

    const existing = db.select().from(externalItems).where(eq(externalItems.id, itemId)).get()
    const prevMeta = existing?.rawJson ? JSON.parse(existing.rawJson) : null

    const meta = {
      listId: task.list?.id,
      listName: task.list?.name,
      folderName: task.folder?.name,
      spaceName: task.space?.name,
      priority: task.priority?.priority ?? null,
      status: task.status?.status ?? null,
      assignees,
      updatedAt: task.date_updated,
      equipe: equipeValue ?? null
    }

    db.insert(externalItems)
      .values({
        id: `cu-task-${task.id}`,
        source: 'clickup',
        externalId: task.id,
        itemType: 'task',
        title: task.name,
        bodySnippet: task.description ?? '',
        url: task.url,
        status: task.status?.status ?? 'Open',
        projectOrRoomName,
        assigneeSummary: assignees.join(', '),
        dueAt: task.due_date ?? null,
        updatedAt: task.date_updated ?? now,
        rawJson: JSON.stringify(meta),
        createdAt: task.date_created ?? now
      })
      .onConflictDoUpdate({
        target: externalItems.id,
        set: {
          title: task.name,
          bodySnippet: task.description ?? '',
          status: task.status?.status ?? 'Open',
          projectOrRoomName,
          assigneeSummary: assignees.join(', '),
          dueAt: task.due_date ?? null,
          updatedAt: task.date_updated ?? now,
          rawJson: JSON.stringify(meta)
        }
      })
      .run()

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

    if (prevMeta?.status && prevMeta.status !== meta.status) {
      notifyOnce(
        `clickup-status-${itemId}-${meta.status}`,
        'ClickUp status changed',
        `${task.name} → ${meta.status}`
      )
    }

    if (isDueToday(task.due_date)) {
      notifyOnce(`clickup-due-${itemId}-${task.due_date}`, 'Task due today', task.name)
    }
  }

  // Remove ClickUp items that no longer exist in the latest sync set
  const existingClickup = db
    .select({ id: externalItems.id })
    .from(externalItems)
    .where(eq(externalItems.source, 'clickup'))
    .all()

  for (const row of existingClickup) {
    if (!seenIds.has(row.id)) {
      db.delete(externalItems).where(eq(externalItems.id, row.id)).run()
      db.delete(plannerState).where(eq(plannerState.itemId, row.id)).run()
    }
  }

  if (tasks.length > 0 && keptCount === 0) {
    const statusSample = Array.from(statusCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => `${name} (${count})`)
      .slice(0, 6)
      .join(', ')
    errors.push(
      `ClickUp: fetched ${tasks.length} tasks but all were filtered by status. Seen statuses: ${statusSample}`
    )
  }

  db.update(syncConnections)
    .set({ lastSyncAt: now, lastError: errors.length ? errors[0] : null })
    .where(eq(syncConnections.id, 'conn-clickup'))
    .run()

  suggestLinksFromGitLab()

  return { synced: tasks.length, errors }
}

export async function addClickUpTaskComment(token: string, taskId: string, comment: string) {
  await clickupPost<{ id: string }>(token, `/task/${taskId}/comment`, {
    comment_text: comment,
    notify_all: true
  })
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

function suggestLinksFromGitLab() {
  const clickupItems = db
    .select()
    .from(externalItems)
    .where(eq(externalItems.source, 'clickup'))
    .all()

  const idToItem = new Map(clickupItems.map((item) => [item.externalId, item.id]))
  const gitlabItems = db
    .select()
    .from(externalItems)
    .where(eq(externalItems.source, 'gitlab'))
    .all()

  for (const mr of gitlabItems) {
    const meta = mr.rawJson ? JSON.parse(mr.rawJson) : {}
    const haystack = `${mr.title}\\n${mr.bodySnippet ?? ''}\\n${meta.sourceBranch ?? ''}`
    const ids = extractClickUpIds(haystack)
    for (const id of ids) {
      const targetId = idToItem.get(id)
      if (!targetId) continue
      const existing = db
        .select()
        .from(links)
        .where(
          or(
            and(eq(links.fromItemId, mr.id), eq(links.toItemId, targetId)),
            and(eq(links.fromItemId, targetId), eq(links.toItemId, mr.id))
          )
        )
        .get()
      if (existing) continue

      db.insert(links)
        .values({
          id: `lnk-${mr.id}-${targetId}`,
          fromItemId: mr.id,
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
}
