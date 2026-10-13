import {ref} from 'vue'

export const theme = ref<'light' | 'dark'>(typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light')

function applyTheme(value: 'light' | 'dark') {
  theme.value = value
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', value === 'dark')
  document.documentElement.style.colorScheme = value
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
