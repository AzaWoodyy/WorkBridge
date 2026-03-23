export type Source = 'gitlab' | 'clickup' | 'rocketchat'
export type ItemType = 'merge_request' | 'task' | 'message'
export type PlannerLane = 'inbox' | 'today' | 'this_week' | 'later' | 'waiting' | 'done'

export type WorkItem = {
  id: string
  source: Source
  itemType: ItemType
  title: string
  snippet: string
  url: string
  status: string
  projectOrRoom: string
  assignees: string[]
  dueAt?: string
  updatedAt: string
  needsReview?: boolean
  meta?: Record<string, any>
}

export type DbExternalItem = {
  id: string
  source: Source
  externalId: string
  itemType: ItemType
  title: string
  bodySnippet?: string | null
  url: string
  status: string
  projectOrRoomName?: string | null
  assigneeSummary?: string | null
  dueAt?: string | null
  updatedAt: string
  rawJson?: string | null
  createdAt: string
}

export type PlannerState = {
  itemId: string
  lane: PlannerLane
  priority: 'P1' | 'P2' | 'P3' | 'P4'
  pinned: boolean
  personalNote?: string | null
}

export type Link = {
  id: string
  fromItemId: string
  toItemId: string
  relationType: 'references' | 'review_request' | 'implements' | 'relates_to'
  origin: 'manual' | 'auto'
  suggested: boolean
}

export type Connection = {
  id: string
  source: Source
  baseUrl?: string | null
  accountLabel?: string | null
  scopeJson?: string | null
  enabled: boolean
  lastSyncAt?: string | null
  lastError?: string | null
  hasToken?: boolean
}

export type SyncStatus = {
  source: string
  status: 'idle' | 'syncing' | 'error'
  lastSyncAt?: string | null
  lastError?: string | null
}

export type ItemLink = {
  id: string
  fromId: string
  toId: string
  relation: 'references' | 'review_request' | 'implements' | 'relates_to'
  origin: 'manual' | 'auto'
  suggested: boolean
}
