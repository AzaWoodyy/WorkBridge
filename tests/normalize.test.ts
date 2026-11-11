import { expect, test } from 'vitest'
import { extractClickUpIds, normalizeMergeRequest } from '../src/main/integrations/normalize'

test('deduplicates ClickUp references from URLs and ticket IDs', () => {
  expect(extractClickUpIds('CU-abc123 https://app.clickup.com/t/abc123\nCU-xyz9')).toEqual([
    'abc123',
    'xyz9'
  ])
  expect(extractClickUpIds('https://example.com/t/abc123')).toEqual([])
})
test('normalizes draft precedence and missing users', () => {
  expect(
    normalizeMergeRequest({
      title: 'Draft: example',
      draft: false,
      reviewers: [{ username: 'alex' }]
    })
  ).toEqual({ isDraft: false, reviewers: ['alex'], assignees: [] })
  expect(normalizeMergeRequest({ title: 'Draft: example' }).isDraft).toBe(true)
  expect(normalizeMergeRequest({ title: 'example', work_in_progress: true }).isDraft).toBe(true)
})
