import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const externalItems = sqliteTable('external_items', {
  id: text('id').primaryKey(),
  source: text('source').notNull(),
  externalId: text('external_id').notNull(),
  itemType: text('item_type').notNull(),
  title: text('title').notNull(),
  bodySnippet: text('body_snippet'),
  url: text('url').notNull(),
  status: text('status').notNull(),
  projectOrRoomName: text('project_or_room_name'),
  assigneeSummary: text('assignee_summary'),
  dueAt: text('due_at'),
  updatedAt: text('updated_at').notNull(),
  rawJson: text('raw_json'),
  createdAt: text('created_at').notNull()
})

export const links = sqliteTable('links', {
  id: text('id').primaryKey(),
  fromItemId: text('from_item_id').notNull(),
  toItemId: text('to_item_id').notNull(),
  relationType: text('relation_type').notNull(),
  origin: text('origin').notNull(),
  confidence: integer('confidence'),
  suggested: integer('suggested', { mode: 'boolean' }).notNull(),
  createdAt: text('created_at').notNull(),
  confirmedAt: text('confirmed_at')
})

export const plannerState = sqliteTable('planner_state', {
  itemId: text('item_id').primaryKey(),
  lane: text('lane').notNull(),
  priority: text('priority').notNull(),
  pinned: integer('pinned', { mode: 'boolean' }).notNull(),
  personalNote: text('personal_note'),
  plannedFor: text('planned_for'),
  updatedAt: text('updated_at').notNull()
})

export const syncConnections = sqliteTable('sync_connections', {
  id: text('id').primaryKey(),
  source: text('source').notNull(),
  baseUrl: text('base_url'),
  accountLabel: text('account_label'),
  scopeJson: text('scope_json'),
  enabled: integer('enabled', { mode: 'boolean' }).notNull(),
  lastSyncAt: text('last_sync_at'),
  lastError: text('last_error')
})

export const syncCursors = sqliteTable('sync_cursors', {
  source: text('source').notNull(),
  scopeKey: text('scope_key').notNull(),
  cursorValue: text('cursor_value').notNull(),
  updatedAt: text('updated_at').notNull()
})
