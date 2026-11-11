import { app, BrowserWindow, nativeImage, nativeTheme } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { seedDemo } from './db/demo'
import { ensureSchema } from './db/init'
import { registerIpc } from './ipc'
import { demoDirectory, isDemo } from './runtime'
import { openExternalUrl } from './security'
import { startSyncLoop } from './sync'

if (demoDirectory) app.setPath('userData', demoDirectory)

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const iconPath = path.join(__dirname, '../../build/icon.png')

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 1080,
    minHeight: 720,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0b0c10',
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  win.setTitle(isDemo ? 'WorkBridge — Demo' : 'WorkBridge')
  win.webContents.setWindowOpenHandler(({ url }) => {
    void openExternalUrl(url).catch(() => {})
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (event, url) => {
    event.preventDefault()
    void openExternalUrl(url).catch(() => {})
  })
  win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    const dev = Boolean(process.env.ELECTRON_RENDERER_URL) && !app.isPackaged
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          `default-src 'self'; script-src 'self'${dev ? " 'unsafe-inline'" : ''}; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'${dev ? ' ws://localhost:* ws://127.0.0.1:*' : ''}; object-src 'none'; base-uri 'none'; frame-src 'none'`
        ]
      }
    })
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  if (process.env.ELECTRON_RENDERER_URL) {
    win.webContents.openDevTools({ mode: 'detach' })
  }
}

app.whenReady().then(async () => {
  app.setName('WorkBridge')
  nativeTheme.themeSource = 'system'
  ensureSchema()
  if (isDemo) seedDemo()
  registerIpc()
  startSyncLoop()
  if (process.platform === 'darwin') {
    const image = nativeImage.createFromPath(iconPath)
    if (!image.isEmpty()) {
      app.dock.setIcon(image)
    }
  }
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
