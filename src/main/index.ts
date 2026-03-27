import path from 'node:path'
import { app, BrowserWindow, nativeImage, nativeTheme } from 'electron'
import { fileURLToPath } from 'node:url'
import { ensureSchema } from './db/init'
import { registerIpc } from './ipc'
import { startSyncLoop } from './sync'

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

  win.setTitle('WorkBridge')

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
