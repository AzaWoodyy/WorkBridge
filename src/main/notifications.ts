import { Notification } from 'electron'
import { db } from './db/db'
import { syncCursors } from './db/schema'
import { and, eq } from 'drizzle-orm'

const SOURCE = 'notify'

const nowIso = () => new Date().toISOString()

export function notifyOnce(key: string, title: string, body: string) {
  if (!Notification.isSupported()) return
  const existing = db
    .select()
    .from(syncCursors)
    .where(and(eq(syncCursors.source, SOURCE), eq(syncCursors.scopeKey, key)))
    .get()
  if (existing) return

  const notification = new Notification({ title, body, silent: false })
  notification.show()

  db.delete(syncCursors)
    .where(and(eq(syncCursors.source, SOURCE), eq(syncCursors.scopeKey, key)))
    .run()
  db.insert(syncCursors)
    .values({
      source: SOURCE,
      scopeKey: key,
      cursorValue: nowIso(),
      updatedAt: nowIso()
    })
    .run()
}
