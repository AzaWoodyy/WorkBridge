import { db } from '../db/db'
import { externalItems, links, plannerState, syncConnections } from '../db/schema'
import { and, eq, or } from 'drizzle-orm'
import { notifyOnce } from '../notifications'

export type RocketChatConnection = {
  baseUrl: string
  token: string
  userId: string
  rooms: string[]
  lookbackDays: number
}

type RocketChatRoom = {
  _id: string
  name?: string
  fname?: string
  t: 'c' | 'p' | 'd'
}

type RocketChatMessage = {
  _id: string
  rid: string
  msg?: string
  ts?: string
  _updatedAt?: string
  u?: { _id: string; username?: string }
  reactions?: Record<
    string,
    { usernames?: string[]; names?: string[]; count?: number }
  >
}

const reviewKeywords = [
  'review',
  'please review',
  'feedback',
  'approve',
  'can someone look',
  'can someone take a look',
  'can someone review'
]

const mrUrlRegex = /(https?:\/\/[^\s)]+\/(?:-\/)?merge_requests\/\d+)/gi

async function rocketFetch<T>(baseUrl: string, token: string, userId: string, path: string): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      'X-Auth-Token': token,
      'X-User-Id': userId
    }
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Rocket.Chat request failed: ${response.status}`)
  }

  return (await response.json()) as T
}

async function rocketPost<T>(
  baseUrl: string,
  token: string,
  userId: string,
  path: string,
  body: unknown
): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'X-Auth-Token': token,
      'X-User-Id': userId,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Rocket.Chat request failed: ${response.status}`)
  }

  return (await response.json()) as T
}

const normalizeRoomIdentifier = (value: string) => value.trim().replace(/^#/, '')

const normalizeRoomName = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\\u0300-\\u036f]/g, '')
    .toLowerCase()
    .trim()

async function fetchJoinedRooms(baseUrl: string, token: string, userId: string): Promise<RocketChatRoom[]> {
  const response = await rocketFetch<{ update: RocketChatRoom[] }>(baseUrl, token, userId, '/api/v1/rooms.get')
  return response.update ?? []
}

async function resolveRoom(
  baseUrl: string,
  token: string,
  userId: string,
  identifier: string,
  roomsCache?: RocketChatRoom[]
): Promise<RocketChatRoom | null> {
  const value = normalizeRoomIdentifier(identifier)
  if (!value) return null
  try {
    const byId = await rocketFetch<{ room: RocketChatRoom }>(
      baseUrl,
      token,
      userId,
      `/api/v1/rooms.info?roomId=${encodeURIComponent(value)}`
    )
    return byId.room ?? null
  } catch (error) {
    // fall through to try by name
  }

  try {
    const byName = await rocketFetch<{ room: RocketChatRoom }>(
      baseUrl,
      token,
      userId,
      `/api/v1/rooms.info?roomName=${encodeURIComponent(value)}`
    )
    return byName.room ?? null
  } catch (error) {
    // try cache by display name / full name
  }

  if (roomsCache?.length) {
    const target = normalizeRoomName(value)
    const match = roomsCache.find((room) => {
      const name = room.name ? normalizeRoomName(room.name) : ''
      const full = room.fname ? normalizeRoomName(room.fname) : ''
      return name === target || full === target
    })
    if (match) return match
  }

  return null
}

function buildRoomUrl(baseUrl: string, room: RocketChatRoom, messageId: string) {
  const roomName = room.name ?? room.fname ?? room._id
  const typePath = room.t === 'c' ? 'channel' : room.t === 'p' ? 'group' : 'direct'
  return `${baseUrl}/${typePath}/${roomName}?msg=${messageId}`
}

function extractMrUrls(text: string) {
  if (!text) return []
  const urls = new Set<string>()
  let match
  while ((match = mrUrlRegex.exec(text))) {
    urls.add(match[1].replace(/[),.]+$/, ''))
  }
  return Array.from(urls)
}

function isReviewRequest(text: string, hasMrLink: boolean) {
  if (!hasMrLink) return false
  const lower = text.toLowerCase()
  return reviewKeywords.some((keyword) => lower.includes(keyword))
}

function normalizeUrlForMatch(url: string) {
  try {
    const parsed = new URL(url)
    return `${parsed.origin}${parsed.pathname}`
  } catch (error) {
    return url
  }
}

async function fetchRoomHistory(
  baseUrl: string,
  token: string,
  userId: string,
  room: RocketChatRoom,
  oldest: string,
  latest: string
) {
  const endpoint =
    room.t === 'c' ? 'channels.history' : room.t === 'p' ? 'groups.history' : room.t === 'd' ? 'dm.history' : null
  if (!endpoint) return []

  const messages: RocketChatMessage[] = []
  let offset = 0
  while (true) {
    const response = await rocketFetch<{ messages: RocketChatMessage[] }>(
      baseUrl,
      token,
      userId,
      `/api/v1/${endpoint}?roomId=${encodeURIComponent(room._id)}&count=100&offset=${offset}&oldest=${encodeURIComponent(
        oldest
      )}&latest=${encodeURIComponent(latest)}`
    )
    const batch = response.messages ?? []
    messages.push(...batch)
    if (batch.length < 100) break
    offset += 100
  }
  return messages
}

export async function syncRocketChat(connection: RocketChatConnection) {
  const { baseUrl, token, userId, rooms, lookbackDays } = connection
  const errors: string[] = []
  const now = new Date()
  const oldest = new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000).toISOString()
  const latest = now.toISOString()
  const seenIds = new Set<string>()

  const roomsCache = await fetchJoinedRooms(baseUrl, token, userId)
  const resolvedRooms: RocketChatRoom[] = []
  for (const roomIdentifier of rooms) {
    const room = await resolveRoom(baseUrl, token, userId, roomIdentifier, roomsCache)
    if (!room) {
      errors.push(`Room "${roomIdentifier}" not found or inaccessible.`)
      continue
    }
    resolvedRooms.push(room)
  }

  const gitlabItems = db
    .select({ id: externalItems.id, url: externalItems.url })
    .from(externalItems)
    .where(eq(externalItems.source, 'gitlab'))
    .all()
  const gitlabUrlMap = new Map(gitlabItems.map((item) => [normalizeUrlForMatch(item.url), item.id]))

  let synced = 0

  for (const room of resolvedRooms) {
    const history = await fetchRoomHistory(baseUrl, token, userId, room, oldest, latest)
    for (const message of history) {
      const text = message.msg ?? ''
      const mrUrls = extractMrUrls(text)
      const reviewRequest = isReviewRequest(text, mrUrls.length > 0)
      const itemId = `rc-msg-${message._id}`
      seenIds.add(itemId)
      synced += 1
      const existing = db.select().from(externalItems).where(eq(externalItems.id, itemId)).get()

      const meta = {
        roomId: room._id,
        roomName: room.name ?? room.fname ?? null,
        roomType: room.t,
        author: message.u?.username ?? null,
        reviewRequest,
        mrUrls,
        reactions: message.reactions ?? null
      }

      const title = text ? text.split('\n')[0].slice(0, 120) : 'Message'
      const url = buildRoomUrl(baseUrl, room, message._id)

      db.insert(externalItems)
        .values({
          id: itemId,
          source: 'rocketchat',
          externalId: message._id,
          itemType: 'message',
          title,
          bodySnippet: text,
          url,
          status: reviewRequest ? 'Review request' : 'Message',
          projectOrRoomName: room.name ?? room.fname ?? room._id,
          assigneeSummary: message.u?.username ?? '',
          dueAt: null,
          updatedAt: message._updatedAt ?? message.ts ?? latest,
          rawJson: JSON.stringify(meta),
          createdAt: message.ts ?? latest
        })
        .onConflictDoUpdate({
          target: externalItems.id,
          set: {
            title,
            bodySnippet: text,
            status: reviewRequest ? 'Review request' : 'Message',
            projectOrRoomName: room.name ?? room.fname ?? room._id,
            assigneeSummary: message.u?.username ?? '',
            updatedAt: message._updatedAt ?? message.ts ?? latest,
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
          updatedAt: latest
        })
        .onConflictDoNothing()
        .run()

      if (mrUrls.length) {
        for (const urlValue of mrUrls) {
          const targetId = gitlabUrlMap.get(normalizeUrlForMatch(urlValue))
          if (!targetId) continue

          const existing = db
            .select()
            .from(links)
            .where(
              or(
                and(eq(links.fromItemId, itemId), eq(links.toItemId, targetId)),
                and(eq(links.fromItemId, targetId), eq(links.toItemId, itemId))
              )
            )
            .get()
          if (existing) continue

          db.insert(links)
            .values({
              id: `lnk-${itemId}-${targetId}`,
              fromItemId: itemId,
              toItemId: targetId,
              relationType: reviewRequest ? 'review_request' : 'references',
              origin: 'auto',
              confidence: reviewRequest ? 85 : 70,
              suggested: true,
              createdAt: latest,
              confirmedAt: null
            })
            .run()
        }
      }

      if (reviewRequest && !existing) {
        const title = 'New review request'
        const body = `${message.u?.username ?? 'Someone'} in ${room.name ?? room.fname ?? room._id}`
        notifyOnce(`rc-review-${itemId}`, title, body)
      }
    }
  }

  const existing = db
    .select({ id: externalItems.id })
    .from(externalItems)
    .where(eq(externalItems.source, 'rocketchat'))
    .all()
  for (const row of existing) {
    if (!seenIds.has(row.id)) {
      db.delete(externalItems).where(eq(externalItems.id, row.id)).run()
      db.delete(plannerState).where(eq(plannerState.itemId, row.id)).run()
    }
  }

  db.update(syncConnections)
    .set({ lastSyncAt: latest, lastError: errors.length ? errors[0] : null })
    .where(eq(syncConnections.id, 'conn-rocketchat'))
    .run()

  return { synced, errors }
}

export async function postRocketChatThreadReply(
  baseUrl: string,
  token: string,
  userId: string,
  roomId: string,
  threadId: string,
  text: string
) {
  await rocketPost<{ message: { _id: string } }>(baseUrl, token, userId, '/api/v1/chat.postMessage', {
    roomId,
    text,
    tmid: threadId
  })
}

export async function reactRocketChatMessage(
  baseUrl: string,
  token: string,
  userId: string,
  messageId: string,
  emoji: string,
  shouldReact: boolean
) {
  await rocketPost<{ success: boolean }>(baseUrl, token, userId, '/api/v1/chat.react', {
    messageId,
    emoji,
    shouldReact
  })
}
