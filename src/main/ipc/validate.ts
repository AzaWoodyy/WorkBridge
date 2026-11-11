import { ipcMain } from 'electron'
import { isDemo } from '../runtime'
import { validateArgs } from './contracts'
const demoBlocked =
  /^(store-token|save-connection|test-connection|list-|gitlab-(add|update|approve|unapprove)|clickup-add|rocketchat-(thread|react)|trigger-sync)/
export const handle: typeof ipcMain.handle = (channel, listener) => {
  const name = channel.replace('workbridge:', '')
  ipcMain.handle(channel, (event, ...args) => {
    if (isDemo && demoBlocked.test(name))
      throw new Error('Remote connections are disabled in demo mode.')
    return listener(event, ...validateArgs(name, args))
  })
}
