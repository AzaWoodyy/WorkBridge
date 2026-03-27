import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const read = (relPath) => fs.readFileSync(path.join(root, relPath), 'utf8')

test('gitlab integration does not hard-delete persisted MRs during sync', () => {
  const gitlabSource = read('src/main/integrations/gitlab.ts')
  assert.equal(
    gitlabSource.includes('db.delete(externalItems)'),
    false,
    'GitLab sync should never delete external_items rows as part of polling reconciliation.'
  )
  assert.equal(
    gitlabSource.includes('db.delete(plannerState)'),
    false,
    'GitLab sync should never delete planner_state rows as part of polling reconciliation.'
  )
})

test('gitlab cursor advancement is guarded by clean sync success only', () => {
  const syncSource = read('src/main/sync.ts')
  assert.equal(
    syncSource.includes('Advance cursor only on a clean sync'),
    true,
    'Expected explicit clean-sync cursor guard.'
  )
  assert.equal(
    syncSource.includes('.set({ lastSyncAt: finishedAt, lastError: null })'),
    true,
    'Expected cursor update in success branch.'
  )
  assert.equal(
    syncSource.includes('.set({ lastError: result.errors[0] })'),
    true,
    'Expected error branch to persist error without forcing cursor movement.'
  )
})

test('startup includes planner-row repair guardrail for persisted data', () => {
  const syncSource = read('src/main/sync.ts')
  assert.equal(
    syncSource.includes("ensurePlannerRowsForSource('gitlab')"),
    true,
    'Expected startup planner repair for persisted GitLab items.'
  )
})

test('gitlab sync orchestrator uses in-flight lock to prevent overlap races', () => {
  const syncSource = read('src/main/sync.ts')
  assert.equal(
    syncSource.includes('let gitlabSyncInFlight: Promise<void> | null = null'),
    true,
    'Expected in-flight lock declaration.'
  )
  assert.equal(
    syncSource.includes('if (gitlabSyncInFlight)'),
    true,
    'Expected in-flight lock check.'
  )
})

test('gitlab sync calls are trigger-aware for diagnostics and lifecycle tracing', () => {
  const syncSource = read('src/main/sync.ts')
  const ipcSource = read('src/main/ipc.ts')
  assert.equal(
    syncSource.includes("type GitLabSyncTrigger = 'startup' | 'poll' | 'manual' | 'mutation' | 'unknown'"),
    true,
    'Expected explicit sync trigger type.'
  )
  assert.equal(
    syncSource.includes("syncGitLabNow({ full: false, trigger: 'poll' })"),
    true,
    'Expected polling trigger annotation.'
  )
  assert.equal(
    ipcSource.includes("syncGitLabNow({ full: true, trigger: 'manual' })"),
    true,
    'Expected manual sync trigger annotation.'
  )
})

test('gitlab sync preserves stable identity via external_id resolution', () => {
  const gitlabSource = read('src/main/integrations/gitlab.ts')
  assert.equal(
    gitlabSource.includes('resolveStableGitLabItemId(externalId, canonicalId)'),
    true,
    'Expected identity resolution by source+external_id before upsert.'
  )
  assert.equal(
    gitlabSource.includes('where(and(eq(externalItems.source, \'gitlab\'), eq(externalItems.externalId, externalId)))'),
    true,
    'Expected source+external_id lookup.'
  )
})

test('renderer list queries do not refetch on window focus', () => {
  const useDbDataSource = read('src/renderer/data/useDbData.ts')
  assert.equal(
    useDbDataSource.includes('refetchOnWindowFocus: false'),
    true,
    'Expected focus refetch to be disabled for stable list visibility.'
  )
})
