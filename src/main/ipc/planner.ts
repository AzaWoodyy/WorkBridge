import { and, eq } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import { db } from '../db/db'
import { externalItems, links, plannerState } from '../db/schema'
import { type PlannerUpdate } from './auth'
import { handle } from './validate'
export function registerPlannerHandlers() {
  handle('workbridge:get-items', () => {
    return db.select().from(externalItems).all()
  })

  handle('workbridge:get-links', () => {
    return db.select().from(links).all()
  })

  handle('workbridge:get-planner', () => {
    return db.select().from(plannerState).all()
  })

  handle('workbridge:upsert-planner', (_event, payload: PlannerUpdate) => {
    const now = new Date().toISOString()
    const existing = db
      .select()
      .from(plannerState)
      .where(eq(plannerState.itemId, payload.itemId))
      .get()

    const next = {
      itemId: payload.itemId,
      lane: payload.lane ?? existing?.lane ?? 'inbox',
      priority: payload.priority ?? existing?.priority ?? 'P3',
      pinned: payload.pinned ?? existing?.pinned ?? false,
      personalNote: payload.personalNote ?? existing?.personalNote ?? null,
      plannedFor: existing?.plannedFor ?? null,
      updatedAt: now
    }

    db.insert(plannerState)
      .values({
        ...next
      })
      .onConflictDoUpdate({
        target: plannerState.itemId,
        set: {
          lane: next.lane,
          priority: next.priority,
          pinned: next.pinned,
          personalNote: next.personalNote,
          updatedAt: next.updatedAt
        }
      })
      .run()

    return { ok: true }
  })

  handle(
    'workbridge:create-link',
    async (
      _event,
      payload: {
        fromId: string
        toId: string
        relationType: string
        origin: 'manual' | 'auto'
        suggested: boolean
      }
    ) => {
      const existing = db
        .select()
        .from(links)
        .where(and(eq(links.fromItemId, payload.fromId), eq(links.toItemId, payload.toId)))
        .get()

      if (existing) return { ok: true }

      db.insert(links)
        .values({
          id: `lnk-${randomUUID()}`,
          fromItemId: payload.fromId,
          toItemId: payload.toId,
          relationType: payload.relationType,
          origin: payload.origin,
          confidence: payload.origin === 'auto' ? 70 : null,
          suggested: payload.suggested,
          createdAt: new Date().toISOString(),
          confirmedAt: payload.suggested ? null : new Date().toISOString()
        })
        .run()

      return { ok: true }
    }
  )

  handle('workbridge:confirm-link', async (_event, linkId: string) => {
    db.update(links)
      .set({ suggested: false, confirmedAt: new Date().toISOString() })
      .where(eq(links.id, linkId))
      .run()
    return { ok: true }
  })
}
