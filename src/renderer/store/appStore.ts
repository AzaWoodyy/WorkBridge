import { create } from 'zustand'

export type ViewKey = 'dashboard' | 'inbox' | 'planner' | 'settings'

type ThemeMode = 'light' | 'dark' | 'system' | 'oled'

type AppState = {
  activeView: ViewKey
  selectedItemId?: string
  drawerOpen: boolean
  commandOpen: boolean
  linkModalOpen: boolean
  theme: ThemeMode
  setActiveView: (view: ViewKey) => void
  openDrawer: (itemId: string) => void
  closeDrawer: () => void
  setCommandOpen: (open: boolean) => void
  setLinkModalOpen: (open: boolean) => void
  setTheme: (theme: ThemeMode) => void
}

export const useAppStore = create<AppState>((set) => ({
  activeView: 'dashboard',
  selectedItemId: undefined,
  drawerOpen: false,
  commandOpen: false,
  linkModalOpen: false,
  theme: 'system',
  setActiveView: (view) => set({ activeView: view, selectedItemId: undefined, drawerOpen: false }),
  openDrawer: (itemId) => set({ selectedItemId: itemId, drawerOpen: true }),
  closeDrawer: () => set({ drawerOpen: false, linkModalOpen: false }),
  setCommandOpen: (open) => set({ commandOpen: open }),
  setLinkModalOpen: (open) => set({ linkModalOpen: open }),
  setTheme: (theme) => set({ theme })
}))
