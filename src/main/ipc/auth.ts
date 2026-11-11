import { eq } from 'drizzle-orm'
import { credentials as keytar } from '../credentials'
import { db } from '../db/db'
import { syncConnections } from '../db/schema'
export const SERVICE_NAME = 'WorkBridge'

export type PlannerUpdate = {
  itemId: string
  lane?: string
  priority?: string
  pinned?: boolean
  personalNote?: string | null
}

export type ConnectionPayload = {
  source: string
  baseUrl?: string | null
  accountLabel?: string | null
  scopeJson?: string | null
  enabled?: boolean
}

export const getGitLabAuth = async () => {
  const connection = db
    .select()
    .from(syncConnections)
    .where(eq(syncConnections.source, 'gitlab'))
    .get()
  if (!connection?.baseUrl) throw new Error('GitLab base URL missing.')
  const token = await keytar.getPassword(SERVICE_NAME, 'gitlab')
  if (!token) throw new Error('GitLab token missing.')
  return { baseUrl: connection.baseUrl, token }
}

export const getClickUpAuth = async () => {
  const token = await keytar.getPassword(SERVICE_NAME, 'clickup')
  if (!token) throw new Error('ClickUp token missing.')
  return { token }
}

export const getRocketChatAuth = async () => {
  const connection = db
    .select()
    .from(syncConnections)
    .where(eq(syncConnections.source, 'rocketchat'))
    .get()
  if (!connection?.baseUrl) throw new Error('Rocket.Chat base URL missing.')
  const token = await keytar.getPassword(SERVICE_NAME, 'rocketchat')
  if (!token) throw new Error('Rocket.Chat token missing.')
  const scope = connection.scopeJson ? JSON.parse(connection.scopeJson) : {}
  const userId = scope.userId ?? null
  if (!userId) throw new Error('Rocket.Chat user id missing.')
  return { baseUrl: connection.baseUrl, token, userId }
}
