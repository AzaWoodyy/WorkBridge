import { shell } from 'electron'

export function isExternalUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    const url = new URL(value)
    return (url.protocol === 'https:' || url.protocol === 'http:') && !url.username && !url.password
  } catch {
    return false
  }
}

export async function openExternalUrl(url: unknown) {
  if (!isExternalUrl(url)) throw new Error('Only HTTP(S) links are allowed.')
  await shell.openExternal(url)
}
