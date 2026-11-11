import { BrowserWindow, Notification } from 'electron'
import { credentials as keytar } from '../credentials'
import { db } from '../db/db'
import { externalItems, links, plannerState, syncConnections, syncCursors } from '../db/schema'
import { openExternalUrl } from '../security'
import {
  getSyncCadence,
  getSyncState,
  resetSyncState,
  setSyncCadence,
  syncClickUpNow,
  syncGitLabNow,
  syncRocketChatNow
} from '../sync'
import { SERVICE_NAME } from './auth'
import { handle } from './validate'
export function registerSystemHandlers() {
  handle('workbridge:test-notification', async () => {
    if (!Notification.isSupported()) {
      return { ok: false, message: 'Notifications are not supported on this system.' }
    }
    const notification = new Notification({
      title: 'WorkBridge',
      body: 'Notifications are working.',
      silent: false
    })
    notification.show()
    return { ok: true }
  })

  handle('workbridge:open-devtools', () => {
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
    if (!win) return { ok: false }
    win.webContents.openDevTools({ mode: 'detach' })
    return { ok: true }
  })

  handle('workbridge:get-sync-status', () => {
    return getSyncState()
  })

  handle('workbridge:get-sync-cadence', () => {
    return { minutes: getSyncCadence() }
  })

  handle('workbridge:set-sync-cadence', (_event, minutes: number) => {
    const value = setSyncCadence(minutes)
    return { minutes: value }
  })

  handle('workbridge:trigger-sync', async (_event, source: string) => {
    if (source === 'gitlab') {
      await syncGitLabNow({ full: true, trigger: 'manual' })
      return { ok: true }
    }
    if (source === 'clickup') {
      await syncClickUpNow()
      return { ok: true }
    }
    if (source === 'rocketchat') {
      await syncRocketChatNow()
      return { ok: true }
    }
    return { ok: false }
  })

  handle('workbridge:flush-all', async () => {
    db.delete(links).run()
    db.delete(plannerState).run()
    db.delete(externalItems).run()
    db.delete(syncCursors).run()
    db.delete(syncConnections).run()

    await Promise.all([
      keytar.deletePassword(SERVICE_NAME, 'gitlab'),
      keytar.deletePassword(SERVICE_NAME, 'clickup'),
      keytar.deletePassword(SERVICE_NAME, 'rocketchat')
    ])

    resetSyncState()
    return { ok: true }
  })

  handle('workbridge:open-external', async (_event, url: string) => {
    if (!url) return { ok: false }
    await openExternalUrl(url)
    return { ok: true }
  })
}
