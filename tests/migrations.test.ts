import { readFileSync } from 'node:fs'
import Database from 'better-sqlite3'
import { expect, test } from 'vitest'
import { migrateDatabase } from '../src/main/db/migrate'

for (const legacy of [false, true]) {
  test(`migrates ${legacy ? 'existing' : 'new'} database and preserves audit triggers`, () => {
    const sqlite = new Database(':memory:')
    try {
      if (legacy) {
        sqlite.exec(readFileSync('tests/fixtures/legacy-schema.sql', 'utf8'))
        sqlite.exec("INSERT INTO planner_state VALUES ('cu-task-demo', 'today', 'P1', 1, 'Preserve me', NULL, '2026-01-01'); INSERT INTO sync_audit_log (event_type,table_name,row_id) VALUES ('old','planner_state','old');")
      }
      migrateDatabase(sqlite, 'drizzle')
      migrateDatabase(sqlite, 'drizzle')
      expect(sqlite.prepare('SELECT * FROM __drizzle_migrations').all()).toHaveLength(2)
      if (legacy) {
        expect(sqlite.prepare('SELECT personal_note FROM planner_state').get()).toEqual({ personal_note: 'Preserve me' })
        sqlite.exec("DELETE FROM planner_state WHERE item_id = 'cu-task-demo'")
        expect(sqlite.prepare('SELECT event_type FROM sync_audit_log ORDER BY id').all()).toEqual([{ event_type: 'old' }, { event_type: 'delete' }])
      } else {
        sqlite.exec("INSERT INTO planner_state VALUES ('cu-task-demo', 'inbox', 'P3', 0, NULL, NULL, '2026-01-01'); DELETE FROM planner_state;")
        expect(sqlite.prepare('SELECT source FROM sync_audit_log').get()).toEqual({ source: 'clickup' })
      }
      expect(sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'trigger'").all()).toHaveLength(2)
    } finally { sqlite.close() }
  })
}
