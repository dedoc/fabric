import {shallowRef, watch} from 'vue'

/** Remember valid display choices; unavailable storage leaves them usable in memory. */
export function useStoredChoice<T extends string>(key: string, choices: readonly T[], fallback: T) {
  let initial = fallback
  try {
    const saved = window.localStorage.getItem(key)
    initial = choices.find(choice => choice === saved) ?? fallback
  } catch { /* Storage may be unavailable or this may be a server render. */ }

  const choice = shallowRef<T>(initial)
  watch(choice, value => {
    if (!choices.includes(value)) return
    try { window.localStorage.setItem(key, value) }
    catch { /* Keep the selection even when storage is blocked or full. */ }
  }, {flush: 'sync'})
  return choice
}
