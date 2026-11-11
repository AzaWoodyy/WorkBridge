import path from 'node:path'
import { app } from 'electron'
import { sqlite } from './db'
import { migrateDatabase } from './migrate'

export function ensureSchema() {
  migrateDatabase(sqlite, path.join(app.getAppPath(), 'drizzle'))
}
