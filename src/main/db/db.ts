import { drizzle } from 'drizzle-orm/better-sqlite3'
import { app } from 'electron'
import { createRequire } from 'node:module'
import path from 'node:path'
import { demoDirectory } from '../runtime'

const require = createRequire(import.meta.url)
const betterSqlite3Module = 'better-sqlite3'
const Database = require(betterSqlite3Module) as typeof import('better-sqlite3')
const getDbPath = () => path.join(demoDirectory ?? app.getPath('userData'), 'workbridge.db')

export const sqlite = new Database(getDbPath())
export const db = drizzle(sqlite)
