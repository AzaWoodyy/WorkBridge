import { expect, test } from 'vitest'
import { validateArgs } from '../src/main/ipc/contracts'
test('rejects invalid IPC mutations before handlers run', () => {
  expect(() => validateArgs('upsert-planner', [{ itemId: 'demo', lane: 'invalid' }])).toThrow()
  expect(() => validateArgs('gitlab-approve', [{ projectId: -1, iid: 2 }])).toThrow()
  expect(() => validateArgs('store-token', ['unknown', 'token'])).toThrow()
  expect(() => validateArgs('save-connection', [{ source: 'clickup', scopeJson: 'broken' }])).toThrow()
  expect(() => validateArgs('get-items', ['unexpected'])).toThrow()
  expect(validateArgs('upsert-planner', [{ itemId: 'demo', personalNote: null }])).toEqual([{ itemId: 'demo', personalNote: null }])
})
