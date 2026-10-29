import {useSyncExternalStore} from 'react'

type Theme = 'light' | 'dark'
let theme: Theme = typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light'
const listeners = new Set<() => void>()
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
export const getTheme = () => theme
export const useTheme = () => useSyncExternalStore(subscribe, getTheme, getTheme)

function applyTheme(value: 'light' | 'dark') {
  theme = value
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', value === 'dark')
    document.documentElement.style.colorScheme = value
  }
  for (const listener of listeners) listener()
}

export function initializeTheme() {
  if (typeof document === 'undefined') return
  let saved: string | null = null
  try { saved = window.localStorage.getItem('fabric-theme') }
  catch { /* Use the page or system theme when storage is unavailable. */ }
  const value = saved === 'light' || saved === 'dark'
    ? saved
    : document.documentElement.classList.contains('dark') || window.matchMedia?.('(prefers-color-scheme: dark)').matches
      ? 'dark' : 'light'
  applyTheme(value)
}

export function setTheme(value: 'light' | 'dark') {
  applyTheme(value)
  if (typeof document === 'undefined') return
  try { window.localStorage.setItem('fabric-theme', value) }
  catch { /* Keep the switch usable when storage is unavailable. */ }
}
