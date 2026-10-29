import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {test} from 'node:test'
import {runInNewContext} from 'node:vm'
import ts from 'typescript'

const {outputText} = ts.transpileModule(readFileSync(new URL('../src/utils/theme.ts', import.meta.url), 'utf8'), {
  compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020},
})

function loadTheme({storage = new Map(), pageDark = false, systemDark = false, blocked = false} = {}) {
  const classes = new Set(pageDark ? ['dark'] : [])
  const root = {
    classList: {
      contains: value => classes.has(value),
      toggle: (value, enabled) => enabled ? classes.add(value) : classes.delete(value),
    },
    style: {},
  }
  const exports = {}
  runInNewContext(outputText, {
    exports,
    require: () => ({useSyncExternalStore: () => { throw new Error('useTheme is not used by these utility tests') }}),
    document: {documentElement: root},
    window: {
      matchMedia: () => ({matches: systemDark}),
      localStorage: {
        getItem: key => { if (blocked) throw Error('Storage unavailable'); return storage.get(key) ?? null },
        setItem: (key, value) => { if (blocked) throw Error('Storage unavailable'); storage.set(key, value) },
      },
    },
  })
  exports.initializeTheme()
  return {...exports, root}
}

test('dark theme survives a fresh page load after toggling', () => {
  const storage = new Map()
  loadTheme({storage}).setTheme('dark')
  const reloaded = loadTheme({storage})
  assert.equal(reloaded.getTheme(), 'dark')
  assert.equal(reloaded.root.classList.contains('dark'), true)
  assert.equal(reloaded.root.style.colorScheme, 'dark')
})

test('saved light preference overrides a dark page and system', () => {
  const result = loadTheme({storage: new Map([['fabric-theme', 'light']]), pageDark: true, systemDark: true})
  assert.equal(result.getTheme(), 'light')
  assert.equal(result.root.classList.contains('dark'), false)
  assert.equal(result.root.style.colorScheme, 'light')
})

test('system fallback does not persist a preference', () => {
  const storage = new Map()
  assert.equal(loadTheme({storage, systemDark: true}).getTheme(), 'dark')
  assert.equal(storage.has('fabric-theme'), false)
  assert.equal(loadTheme({storage, systemDark: false}).getTheme(), 'light')
})

test('invalid or unavailable storage falls back safely and the switch still works', () => {
  assert.equal(loadTheme({storage: new Map([['fabric-theme', 'invalid']]), systemDark: true}).getTheme(), 'dark')
  const result = loadTheme({blocked: true, pageDark: true})
  assert.equal(result.getTheme(), 'dark')
  result.setTheme('light')
  assert.equal(result.getTheme(), 'light')
  assert.equal(result.root.classList.contains('dark'), false)
})
