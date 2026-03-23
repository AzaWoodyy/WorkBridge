import { sqlite } from './db'

export function ensureSchema() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS external_items (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      external_id TEXT NOT NULL,
      item_type TEXT NOT NULL,
      title TEXT NOT NULL,
      body_snippet TEXT,
      url TEXT NOT NULL,
      status TEXT NOT NULL,
      project_or_room_name TEXT,
      assignee_summary TEXT,
      due_at TEXT,
      updated_at TEXT NOT NULL,
      raw_json TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS links (
      id TEXT PRIMARY KEY,
      from_item_id TEXT NOT NULL,
      to_item_id TEXT NOT NULL,
      relation_type TEXT NOT NULL,
      origin TEXT NOT NULL,
      confidence INTEGER,
      suggested INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      confirmed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS planner_state (
      item_id TEXT PRIMARY KEY,
      lane TEXT NOT NULL,
      priority TEXT NOT NULL,
      pinned INTEGER NOT NULL,
      personal_note TEXT,
      planned_for TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sync_connections (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      base_url TEXT,
      account_label TEXT,
      scope_json TEXT,
      enabled INTEGER NOT NULL,
      last_sync_at TEXT,
      last_error TEXT
    );

    CREATE TABLE IF NOT EXISTS sync_cursors (
      source TEXT NOT NULL,
      scope_key TEXT NOT NULL,
      cursor_value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `)
}
