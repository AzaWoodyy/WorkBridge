import { createRequire } from 'node:module'
import { isDemo } from './runtime'
const require = createRequire(import.meta.url)
export const credentials: typeof import('keytar') = isDemo ? {
  getPassword: async () => null,
  setPassword: async () => { throw new Error('Credentials are disabled in demo mode.') },
  deletePassword: async () => false,
  findPassword: async () => null,
  findCredentials: async () => []
} : require('keytar')
