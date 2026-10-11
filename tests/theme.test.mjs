import assert from 'node:assert/strict'
import {after, test} from 'node:test'
import {readFile} from 'node:fs/promises'
import {runInNewContext} from 'node:vm'
import {createServer as createHttpServer} from 'node:http'
import {createServer} from 'vite'
import {createSSRApp, h} from 'vue'
import {renderToString} from 'vue/server-renderer'

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8')
const startup = html.match(/<script>([\s\S]*?)<\/script>/)[1]
function browser(saved, systemDark = false, blocked = false) {
  const classes = new Set()
  const storage = new Map(saved ? [['fabric-theme', saved]] : [])
  return {
    document: {documentElement: {
      classList: {
        contains: value => classes.has(value),
        toggle: (value, enabled) => enabled ? classes.add(value) : classes.delete(value),
      },
      style: {},
    }},
    localStorage: {
      getItem: key => { if (blocked) throw new Error('Storage blocked'); return storage.get(key) ?? null },
      setItem: (key, value) => { if (blocked) throw new Error('Storage blocked'); storage.set(key, value) },
    },
    window: {matchMedia: () => ({matches: systemDark})},
  }
}

test('saved themes override the system theme before rendering', () => {
  for (const [saved, systemDark, expected] of [
    ['light', true, 'light'], ['dark', false, 'dark'],
    [undefined, true, 'dark'], [undefined, false, 'light'], ['invalid', true, 'dark'],
  ]) {
    const context = browser(saved, systemDark)
    runInNewContext(startup, context)
    assert.equal(context.document.documentElement.classList.contains('dark'), expected === 'dark')
    assert.equal(context.document.documentElement.style.colorScheme, expected)
  }
})

test('startup works when storage is blocked', () => {
  const context = browser(undefined, true, true)
  runInNewContext(startup, context)
  assert.equal(context.document.documentElement.style.colorScheme, 'dark')
})

const server = await createServer({server: {middlewareMode: true, hmr: {server: createHttpServer()}}})
after(() => server.close())
const {setTheme, theme} = await server.ssrLoadModule('/src/utils/theme.ts')
const {default: HighlightedCode} = await server.ssrLoadModule('/src/components/OpenApi/HighlightedCode.vue')

test('theme changes persist and survive a fresh startup, including blocked storage', () => {
  const previousDocument = globalThis.document
  const previousWindow = globalThis.window
  try {
    const context = browser()
    globalThis.document = context.document
    globalThis.window = {localStorage: context.localStorage}
    for (const value of ['dark', 'light']) {
      setTheme(value)
      assert.equal(context.localStorage.getItem('fabric-theme'), value)
      assert.equal(context.document.documentElement.style.colorScheme, value)
      // Reapply even if reactive state already has this value (e.g. after HMR).
      context.document.documentElement.classList.toggle('dark', value !== 'dark')
      setTheme(value)
      assert.equal(context.document.documentElement.classList.contains('dark'), value === 'dark')
      const reloaded = browser(context.localStorage.getItem('fabric-theme'), value !== 'dark')
      runInNewContext(startup, reloaded)
      assert.equal(reloaded.document.documentElement.style.colorScheme, value)
    }
    globalThis.window = {localStorage: browser(undefined, false, true).localStorage}
    setTheme('dark')
    assert.equal(context.document.documentElement.style.colorScheme, 'dark')
    setTheme('light')
  } finally {
    globalThis.document = previousDocument
    globalThis.window = previousWindow
  }
})

test('code highlighting changes palettes while preserving the code', async () => {
  const code = '{"name": "Fabric", "active": true}\n'
  const render = () => renderToString(createSSRApp({render: () => h(HighlightedCode, {code, language: 'json'})}))
  try {
    theme.value = 'light'
    const light = await render()
    theme.value = 'dark'
    const dark = await render()
    assert.notEqual(light, dark)
    assert.equal(light.replace(/<[^>]*>/g, ''), dark.replace(/<[^>]*>/g, ''))
  } finally { theme.value = 'light' }
})
