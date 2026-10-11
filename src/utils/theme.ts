import {ref} from 'vue'

export const theme = ref<'light' | 'dark'>(typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light')

export function setTheme(value: 'light' | 'dark') {
  theme.value = value
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', value === 'dark')
  document.documentElement.style.colorScheme = value
  try { window.localStorage.setItem('fabric-theme', value) }
  catch { /* Keep the switch usable when storage is unavailable. */ }
}
