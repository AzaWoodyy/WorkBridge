import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

export const isDemo = process.env.WORKBRIDGE_DEMO === '1'
// A new disposable profile per launch; never read the normal database or Keychain.
export const demoDirectory = isDemo ? mkdtempSync(path.join(tmpdir(), 'workbridge-demo-')) : null
