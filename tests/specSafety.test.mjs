import assert from 'node:assert/strict'
import {createServer as createHttpServer} from 'node:http'
import {after, test} from 'node:test'
import {createServer, transformWithEsbuild} from 'vite'
import {compileScript, compileTemplate, parse as parseVue} from '@vue/compiler-sfc'
import {createRenderer, h, nextTick, provide, ref} from 'vue'

// Compile client render functions so the lightweight host can exercise mounted UI states.
const server = await createServer({configFile: false, plugins: [{
  name: 'client-components-for-tests',
  async transform(source, id) {
    if (!id.endsWith('.vue')) return
    const {descriptor} = parseVue(source)
    if (!descriptor.script && !descriptor.scriptSetup) {
      return compileTemplate({source: descriptor.template.content, filename: id, id}).code + '\nexport default {render}'
    }
    const compiled = compileScript(descriptor, {id, inlineTemplate: true})
    return transformWithEsbuild(compiled.content, id, {loader: 'ts'})
  },
}], server: {middlewareMode: true, hmr: {server: createHttpServer()}}})
after(() => server.close())
const {renderDescription} = await server.ssrLoadModule('/src/components/OpenApi/descriptionHtml.ts')
const {parseSpecification, fetchSpecification} = await server.ssrLoadModule('/src/components/OpenApi/specification.ts')
const {default: Viewer} = await server.ssrLoadModule('/src/components/HelloWorld.vue')
const {default: Examples} = await server.ssrLoadModule('/src/components/OpenApi/Examples.vue')
const {provideAuthCredentials} = await server.ssrLoadModule('/src/components/OpenApi/useAuthCredentials.ts')
const {documentKey} = await server.ssrLoadModule('/src/utils/symbols.ts')
const {provideMediaTypeSelections} = await server.ssrLoadModule('/src/components/OpenApi/useMediaType.ts')
const valid = {openapi: '3.0.3', info: {title: 'Recovered API', version: '1.0'}, paths: {}}

test('OpenAPI 3.1 supports webhook-only documents and validates webhook operations', () => {
  const specification = {openapi: '3.1.0', info: valid.info, webhooks: {
    required: {post: {responses: {'204': {description: 'Accepted'}}}},
  }}
  assert.deepEqual(parseSpecification(JSON.stringify(specification)).paths, {})
  assert.throws(() => parseSpecification(JSON.stringify({...specification, webhooks: []})), /webhooks must be an object/)
  assert.throws(() => parseSpecification(JSON.stringify({...specification, webhooks: {event: {post: {}}}})), /Responses for webhook/)
})

test('description sanitizer preserves formatting and safe links while removing active HTML', () => {
  const html = renderDescription(`## Guide

**Bold** and *italic*, \`code\`, [docs](https://example.com).

<table><tr><td>Cell</td></tr></table><details><summary>More</summary>Text</details>
<img src="https://example.com/image.png" alt="Diagram" onerror="alert(1)" style="position:fixed">
<script>alert(1)</script><iframe src="https://example.com"></iframe>
<svg><a href="javascript:alert(1)">Bad</a></svg><form><input autofocus onfocus="alert(1)"></form>
<a href="javascript:alert(1)" onclick="alert(1)">Bad</a>
<a href="java&#x09;script:alert(1)">Encoded</a>
<img src="data:image/svg+xml,attack"><img src="//example.com/image.png">`)
  assert.match(html, /<h2>Guide<\/h2>/)
  assert.match(html, /<strong>Bold<\/strong> and <em>italic<\/em>/)
  assert.match(html, /<code>code<\/code>/)
  assert.match(html, /href="https:\/\/example.com" target="_blank" rel="noopener noreferrer"/)
  assert.match(html, /<table>/)
  assert.match(html, /<details><summary>More<\/summary>/)
  assert.match(html, /src="https:\/\/example.com\/image.png" alt="Diagram"/)
  assert.doesNotMatch(html, /onerror|onclick|onfocus|style=|javascript:|data:|<script|<iframe|<svg|<form|<input|src="\/\//i)
})

test('JSON and YAML documents pass structural checks', () => {
  assert.equal(parseSpecification(JSON.stringify(valid)).info.title, 'Recovered API')
  assert.equal(parseSpecification('openapi: 3.1.0\ninfo: {title: API, version: "1"}\npaths: {}').info.title, 'API')
  assert.doesNotThrow(() => parseSpecification(JSON.stringify({...valid, components: {
    schemas: {description: {type: 'object', properties: {description: {type: 'number'}}, example: {description: 42}}},
    parameters: {description: {name: 'limit', in: 'query', schema: {type: 'integer'}}},
  }, security: [{description: []}]})))
})

test('invalid documents fail with readable messages instead of reaching the renderer', () => {
  for (const source of ['', '<html>Not a spec</html>', 'info: [', JSON.stringify({...valid, openapi: '2.0'}),
    JSON.stringify({...valid, info: {title: 'API'}}), JSON.stringify({...valid, paths: []}),
    JSON.stringify({...valid, paths: {'/files': {get: {responses: []}}}}),
    JSON.stringify({...valid, components: {schemas: {Bad: {description: 42}}}}),
    'openapi: 3.0.3\ninfo: {title: API, version: "1"}\npaths: {}\ncomponents:\n  schemas:\n    Loop: &loop\n      properties:\n        self: *loop',
  ]) assert.throws(() => parseSpecification(source), error => error.name === 'Error' && error.message.length > 0)
})

test('response and component links accept parameter maps and request-body expressions', () => {
  const link = {operationId: 'getPlanet', parameters: {id: '$response.body#/id', description: 42}, requestBody: '$response.body'}
  assert.doesNotThrow(() => parseSpecification(JSON.stringify({...valid, paths: {'/planets': {get: {responses: {
    200: {description: 'OK', links: {GetPlanet: link}},
  }}}}, components: {links: {GetPlanet: link}}})))
  assert.throws(() => parseSpecification(JSON.stringify({...valid, paths: {'/planets': {get: {parameters: {}, responses: {}}}}})), /parameters must be an array/)
})

test('remote loading handles HTTP, network, and HTML fallback failures', async () => {
  const original = globalThis.fetch
  try {
    globalThis.fetch = async () => new Response('Unavailable', {status: 503})
    await assert.rejects(fetchSpecification('https://example.com/spec'), /HTTP 503/)
    globalThis.fetch = async () => { throw new TypeError('Network failure') }
    await assert.rejects(fetchSpecification('https://example.com/spec'), /URL and connection/)
    globalThis.fetch = async () => new Response('<!doctype html><html>SPA fallback</html>')
    await assert.rejects(fetchSpecification('https://example.com/spec'), /must be an object/)
  } finally { globalThis.fetch = original }
})

test('slow remote loads time out and abort the outstanding fetch', async t => {
  const original = globalThis.fetch
  t.mock.timers.enable({apis: ['setTimeout']})
  let signal
  globalThis.fetch = (url, options) => new Promise((resolve, reject) => {
    signal = options.signal
    signal.addEventListener('abort', () => reject(new Error('Aborted')), {once: true})
  })
  try {
    const result = assert.rejects(fetchSpecification('https://example.com/spec'), /timed out/)
    t.mock.timers.tick(30_000)
    await result
    assert.equal(signal.aborted, true)
  } finally { globalThis.fetch = original; t.mock.timers.reset() }
})

function mountViewer(url = '/spec.json', hash = '#overview', component) {
  const originalWindow = globalThis.window
  globalThis.window = {location: {href: `https://example.com/${hash}`}, history: {pushState() {}}, scrollTo() {}, addEventListener() {}, removeEventListener() {},
    matchMedia: () => ({addEventListener() {}, removeEventListener() {}})}
  const node = (type, text = '') => ({type, tagName: type.toUpperCase(), text, children: [], props: {}, parent: null,
    get options() { return this.children.filter(child => child.type === 'option') },
    addEventListener() {}, removeEventListener() {}, getAttribute(key) { return this.props[key] }})
  const renderer = createRenderer({
    createElement: type => node(type), createText: text => node('#text', text), createComment: text => node('#comment', text),
    insertStaticContent(content, parent, anchor) {
      const el = node('#static', content)
      el.parent = parent
      const index = anchor ? parent.children.indexOf(anchor) : -1
      if (index < 0) parent.children.push(el); else parent.children.splice(index, 0, el)
      return [el, el]
    },
    setText: (el, text) => { el.text = text }, setElementText: (el, text) => { el.text = text; el.children = [] },
    patchProp: (el, key, previous, value) => { el.props[key] = value; if (key === 'value') el.value = value },
    insert(el, parent, anchor) {
      if (el.parent) el.parent.children.splice(el.parent.children.indexOf(el), 1)
      el.parent = parent
      const index = anchor ? parent.children.indexOf(anchor) : -1
      if (index < 0) parent.children.push(el); else parent.children.splice(index, 0, el)
    },
    remove(el) { if (el.parent) el.parent.children.splice(el.parent.children.indexOf(el), 1) },
    parentNode: el => el.parent,
    nextSibling: el => el.parent?.children[el.parent.children.indexOf(el) + 1],
  })
  const root = node('root')
  const source = ref(url)
  const app = renderer.createApp(component ?? {render: () => h(Viewer, {specUrl: source.value})})
  app.config.warnHandler = () => {}
  app.mount(root)
  const text = el => el.text + el.children.map(text).join(' ')
  const find = (el, type) => el.type === type ? el : el.children.map(child => find(child, type)).find(Boolean)
  const matching = (el, predicate) => predicate(el) ? el : el.children.map(child => matching(child, predicate)).find(Boolean)
  return {source, text: () => text(root), button: () => find(root, 'button'), find: predicate => matching(root, predicate), close() {
    app.unmount()
    if (originalWindow === undefined) delete globalThis.window; else globalThis.window = originalWindow
  }}
}

async function until(check) {
  for (let i = 0; i < 30; i++) {
    await nextTick()
    if (check()) return
    await new Promise(resolve => setImmediate(resolve))
  }
  assert.ok(check(), 'Viewer did not reach expected state')
}

test('Copy uses encoded credentials while the visible example stays masked and its chip opens authentication', async () => {
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
  let copied = ''
  let opened = 0
  let saved
  Object.defineProperty(globalThis, 'navigator', {configurable: true, value: {clipboard: {writeText: async value => { copied = value }}}})
  const document = {security: [{Basic: []}], components: {securitySchemes: {Basic: {type: 'http', scheme: 'basic'}}}}
  const viewer = mountViewer('/spec.json', '#overview', {setup() {
    provide(documentKey, ref(document))
    provideMediaTypeSelections()
    saved = provideAuthCredentials()
    saved.value.Basic = {username: 'demo-key', password: ''}
    return () => h(Examples, {base: 'https://example.com', path: '/files', method: 'get', operation: {},
      components: document.components, onAuthenticate: () => { opened++ },
    })
  }})
  globalThis.window.setTimeout = () => 0
  try {
    const encoded = Buffer.from('demo-key:').toString('base64')
    assert.doesNotMatch(viewer.text(), /demo-key/)
    assert.ok(!viewer.text().includes(encoded))
    const chip = viewer.find(el => el.props['aria-label'] === 'Edit authentication credentials')
    chip.props.onClick({currentTarget: chip})
    assert.equal(opened, 1)
    await viewer.find(el => el.props['aria-label'] === 'Copy request example').props.onClick()
    assert.ok(copied.includes(`Authorization: Basic ${encoded}`))
    assert.doesNotMatch(copied, /demo-key|__FABRIC|••••/)
    saved.value.Basic = {username: 'demo-key', password: 'new-password'}
    await nextTick()
    await viewer.find(el => ['Copy request example', 'Copied request'].includes(el.props['aria-label'])).props.onClick()
    assert.ok(copied.includes(Buffer.from('demo-key:new-password').toString('base64')))
    viewer.find(el => el.props['aria-label'] === 'Request example sender').props['onUpdate:modelValue']('laravel')
    await nextTick()
    await viewer.find(el => ['Copy request example', 'Copied request'].includes(el.props['aria-label'])).props.onClick()
    assert.ok(copied.includes(`withHeaders(['Authorization' => 'Basic ${Buffer.from('demo-key:new-password').toString('base64')}'])`))
    assert.doesNotMatch(viewer.text(), /demo-key|new-password/)
    delete saved.value.Basic
    await nextTick()
    assert.ok(viewer.find(el => el.props['aria-label'] === 'Set authentication credentials'))
  } finally {
    viewer.close()
    if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator)
    else delete globalThis.navigator
  }
})

test('Bearer copy includes the original token while display, editing and clearing remain masked', async () => {
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
  let copied = ''
  let saved
  Object.defineProperty(globalThis, 'navigator', {configurable: true, value: {clipboard: {writeText: async value => { copied = value }}}})
  const document = {security: [{Token: []}], components: {securitySchemes: {Token: {type: 'http', scheme: 'bearer'}}}}
  const viewer = mountViewer('/spec.json', '#overview', {setup() {
    provide(documentKey, ref(document))
    provideMediaTypeSelections()
    saved = provideAuthCredentials()
    return () => h(Examples, {base: 'https://example.com', path: '/files', method: 'get', operation: {}, components: document.components})
  }})
  globalThis.window.setTimeout = () => 0
  try {
    assert.ok(viewer.find(el => el.props['aria-label'] === 'Set authentication credentials'))
    saved.value.Token = {token: 'opaque.demo-token'}
    await nextTick()
    assert.ok(viewer.find(el => el.props['aria-label'] === 'Edit authentication credentials'))
    assert.doesNotMatch(viewer.text(), /opaque.demo-token/)
    await viewer.find(el => el.props['aria-label'] === 'Copy request example').props.onClick()
    assert.ok(copied.includes("-H 'Authorization: Bearer opaque.demo-token'"))
    assert.doesNotMatch(copied, /Basic|__FABRIC|••••/)
    viewer.find(el => el.props['aria-label'] === 'Request example sender').props['onUpdate:modelValue']('laravel')
    saved.value.Token = {token: 'updated.demo-token'}
    await nextTick()
    await viewer.find(el => ['Copy request example', 'Copied request'].includes(el.props['aria-label'])).props.onClick()
    assert.ok(copied.includes("withHeaders(['Authorization' => 'Bearer updated.demo-token'])"))
    assert.doesNotMatch(viewer.text(), /opaque.demo-token|updated.demo-token/)
    delete saved.value.Token
    await nextTick()
    assert.ok(viewer.find(el => el.props['aria-label'] === 'Set authentication credentials'))
    await viewer.find(el => ['Copy request example', 'Copied request'].includes(el.props['aria-label'])).props.onClick()
    assert.doesNotMatch(copied, /Authorization|opaque.demo-token|updated.demo-token/)
  } finally {
    viewer.close()
    if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator)
    else delete globalThis.navigator
  }
})

test('the small error page retries loading and recovers to the API reference', async () => {
  const original = globalThis.fetch
  let calls = 0
  globalThis.fetch = async () => ++calls === 1 ? new Response('', {status: 503}) : new Response(JSON.stringify(valid))
  const viewer = mountViewer()
  try {
    assert.match(viewer.text(), /Loading API reference/)
    await until(() => viewer.text().includes('HTTP 503'))
    assert.match(viewer.text(), /Unable to display this API/)
    assert.equal(viewer.button().text, 'Try again')
    viewer.button().props.onClick()
    await until(() => viewer.text().includes('Recovered API'))
    assert.doesNotMatch(viewer.text(), /Unable to display this API/)
  } finally { viewer.close(); globalThis.fetch = original }
})

test('unresolved schemas show local warnings while navigation remains usable', async () => {
  const original = globalThis.fetch
  globalThis.fetch = async () => new Response(JSON.stringify({...valid, components: {schemas: {Broken: {
    $ref: '#/components/schemas/Missing',
  }}}}))
  const viewer = mountViewer('/spec.json', '#schemas/Broken')
  try {
    await until(() => viewer.text().includes('Reference target was not found'))
    assert.match(viewer.text(), /#\/components\/schemas\/Missing/)
    assert.doesNotMatch(viewer.text(), /Unable to display this API/)
    const overview = viewer.find(el => el.props.href === '#overview')
    assert.ok(overview)
    overview.props.onClick({preventDefault() {}})
    await until(() => !viewer.text().includes('Reference target was not found'))
    assert.match(viewer.text(), /Recovered API/)
  } finally { viewer.close(); globalThis.fetch = original }
})

test('switching sources aborts old requests and ignores stale results', async () => {
  const original = globalThis.fetch
  let resolveFirst
  let firstSignal
  globalThis.fetch = (url, options) => url === '/first.json'
    ? (firstSignal = options.signal, new Promise(resolve => { resolveFirst = resolve }))
    : Promise.resolve(new Response(JSON.stringify(valid)))
  const viewer = mountViewer('/first.json')
  try {
    viewer.source.value = '/second.json'
    await until(() => viewer.text().includes('Recovered API'))
    assert.equal(firstSignal.aborted, true)
    resolveFirst(new Response('Bad specification'))
    await new Promise(resolve => setImmediate(resolve))
    await nextTick()
    assert.match(viewer.text(), /Recovered API/)
    assert.doesNotMatch(viewer.text(), /Unable to display/)
  } finally { viewer.close(); globalThis.fetch = original }
})
