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

    CREATE TABLE IF NOT EXISTS sync_audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      table_name TEXT NOT NULL,
      row_id TEXT NOT NULL,
      source TEXT,
      payload_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TRIGGER IF NOT EXISTS trg_audit_external_items_delete
    AFTER DELETE ON external_items
    BEGIN
      INSERT INTO sync_audit_log (event_type, table_name, row_id, source, payload_json)
      VALUES (
        'delete',
        'external_items',
        OLD.id,
        OLD.source,
        json_object('external_id', OLD.external_id, 'item_type', OLD.item_type, 'status', OLD.status)
      );
    END;

    CREATE TRIGGER IF NOT EXISTS trg_audit_planner_state_delete
    AFTER DELETE ON planner_state
    BEGIN
      INSERT INTO sync_audit_log (event_type, table_name, row_id, source, payload_json)
      VALUES (
        'delete',
        'planner_state',
        OLD.item_id,
        CASE
          WHEN OLD.item_id LIKE 'gl-mr-%' THEN 'gitlab'
          WHEN OLD.item_id LIKE 'cu-task-%' THEN 'clickup'
          WHEN OLD.item_id LIKE 'rc-msg-%' THEN 'rocketchat'
          ELSE NULL
        END,
        json_object('lane', OLD.lane, 'priority', OLD.priority, 'pinned', OLD.pinned)
      );
    END;
  `)
}
