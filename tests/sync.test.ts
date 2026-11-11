import { afterAll, beforeEach, expect, test, vi } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { externalItems, plannerState } from '../src/main/db/schema'

const memory = vi.hoisted(() => ({
  sqlite: null as unknown as Database.Database,
  db: null as unknown as ReturnType<typeof drizzle>
}))
vi.mock('../src/main/db/db', () => memory)
vi.mock('../src/main/notifications', () => ({ notifyOnce: vi.fn() }))
const { ensureSchema } = await import('../src/main/db/init')
const { syncGitLab } = await import('../src/main/integrations/gitlab')
const mr = {
  id: 42,
  iid: 2,
  project_id: 1,
  title: 'Keyboard navigation',
  state: 'opened',
  web_url: 'https://example.com/mr/2',
  updated_at: '2026-01-01',
  created_at: '2026-01-01'
}
const config = { baseUrl: 'https://example.com', token: 'fictional', scope: { projects: ['1'] } }
beforeEach(() => {
  memory.sqlite?.close()
  memory.sqlite = new Database(':memory:')
  memory.db = drizzle(memory.sqlite)
  ensureSchema()
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async (url: string) =>
        new Response(JSON.stringify(url.includes('?state=') ? [mr] : {}), { status: 200 })
    )
  )
})
afterAll(() => {
  memory.sqlite.close()
  vi.unstubAllGlobals()
})
test('upserts without overwriting personal planner state and keeps unseen MRs', async () => {
  await syncGitLab(config)
  memory.db.update(plannerState).set({ lane: 'today', personalNote: 'Keep this note' }).run()
  await syncGitLab(config)
  expect(memory.db.select().from(externalItems).all()).toHaveLength(1)
  expect(memory.db.select().from(plannerState).get()).toMatchObject({
    lane: 'today',
    personalNote: 'Keep this note'
  })
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('[]'))
  )
  await syncGitLab(config)
  expect(memory.db.select().from(externalItems).all()).toHaveLength(1)
})
test('keeps local data on failed fetch and reports the error', async () => {
  await syncGitLab(config)
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('Unavailable', { status: 503 }))
  )
  expect((await syncGitLab(config)).errors).toHaveLength(1)
  expect(memory.db.select().from(externalItems).all()).toHaveLength(1)
})
test('preserves historical identity with personal state', async () => {
  await syncGitLab(config)
  memory.sqlite.exec(
    "UPDATE external_items SET id = 'legacy'; UPDATE planner_state SET item_id = 'legacy', lane = 'today';"
  )
  await syncGitLab(config)
  expect(
    memory.db
      .select()
      .from(externalItems)
      .all()
      .map((row) => row.id)
  ).toEqual(['legacy'])
  expect(memory.db.select().from(plannerState).get()?.lane).toBe('today')
})
