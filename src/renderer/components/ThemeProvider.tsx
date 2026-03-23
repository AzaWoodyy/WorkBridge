import { useEffect, type ReactNode } from 'react'
import { useAppStore } from '@renderer/store/appStore'

const getSystemPrefersDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useAppStore((state) => state.theme)

  useEffect(() => {
    const root = document.documentElement
    const effective = theme === 'system' ? (getSystemPrefersDark() ? 'dark' : 'light') : theme
    root.classList.toggle('dark', effective === 'dark' || effective === 'oled')
    root.classList.toggle('oled', effective === 'oled')
  }, [theme])

  return <>{children}</>
}
