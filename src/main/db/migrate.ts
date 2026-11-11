import type Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'

export function migrateDatabase(sqlite: Database.Database, migrationsFolder: string) {
  migrate(drizzle(sqlite), { migrationsFolder })
}
