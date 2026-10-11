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

test('component example values remain arbitrary payloads without weakening metadata or schema checks', () => {
  const payload = [{repository: {description: null, summary: 42, parameters: {}, required: 'data',
    properties: [], $ref: 123, servers: [{url: false}], value: {description: false},
  }}]
  const example = {summary: 'Organization alerts', description: 'A response payload', value: payload}
  const specification = {...valid, components: {examples: {
    'dependabot-alerts-for-organization': example,
    value: {value: {description: null}},
    Alias: {$ref: '#/components/examples/dependabot-alerts-for-organization'},
  }}}
  const parsed = parseSpecification(JSON.stringify(specification))
  assert.deepEqual(parsed.components.examples['dependabot-alerts-for-organization'].value, payload)
  for (const field of ['summary', 'description', '$ref']) {
    assert.throws(() => parseSpecification(JSON.stringify({...valid, components: {examples: {Bad: {[field]: 42, value: payload}}}})), new RegExp(`examples\\.Bad\\.${field === '$ref' ? '\\$ref' : field} must be a string`))
  }
  assert.throws(() => parseSpecification(JSON.stringify({...valid, components: {schemas: {
    WithValue: {type: 'object', properties: {value: {description: null}}},
  }}})), /properties\.value\.description must be a string/)
})

test('response and component links accept parameter maps and request-body expressions', () => {
  const link = {operationId: 'getPlanet', parameters: {id: '$response.body#/id', description: 42}, requestBody: '$response.body'}
  assert.doesNotThrow(() => parseSpecification(JSON.stringify({...valid, paths: {'/planets': {get: {responses: {
    200: {description: 'OK', links: {GetPlanet: link}},
  }}}}, components: {links: {GetPlanet: link}}})))
  assert.throws(() => parseSpecification(JSON.stringify({...valid, paths: {'/planets': {get: {parameters: {}, responses: {}}}}})), /parameters must be an array/)
})

test('form encoding keys are field names, while encoding headers retain structural checks', () => {
  const encoding = Object.fromEntries(['description', 'summary', '$ref', 'properties', 'parameters', 'required', 'encoding'].map(name =>
    [name, {explode: true, style: 'deepObject'}],
  ))
  encoding.description.headers = {description: {description: 'Encoding header', schema: {type: 'string'}}}
  const specification = {...valid, paths: {
    '/v1/payment_records/{id}/report_payment_attempt_informational': {post: {
      requestBody: {content: {'application/x-www-form-urlencoded': {encoding}}},
      responses: {200: {description: 'OK'}},
    }},
  }}
  const parsed = parseSpecification(JSON.stringify(specification))
  assert.deepEqual(parsed.paths[Object.keys(specification.paths)[0]].post.requestBody.content['application/x-www-form-urlencoded'].encoding, encoding)
  encoding.description.headers.description.description = 42
  assert.throws(() => parseSpecification(JSON.stringify(specification)), /encoding\.description\.headers\.description\.description must be a string/)
  encoding.description.headers = []
  assert.throws(() => parseSpecification(JSON.stringify(specification)), /encoding\.description\.headers must be an object/)
  specification.paths[Object.keys(specification.paths)[0]].post.requestBody.content['application/x-www-form-urlencoded'].encoding = []
  assert.throws(() => parseSpecification(JSON.stringify(specification)), /encoding must be an object/)
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

test('copied request examples match the displayed authorization placeholders', async () => {
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
  let copied = ''
  Object.defineProperty(globalThis, 'navigator', {configurable: true, value: {clipboard: {writeText: async value => { copied = value }}}})
  try {
    for (const scheme of [{type: 'http', scheme: 'basic'}, {type: 'http', scheme: 'bearer'}, {type: 'oauth2', flows: {}}, {type: 'openIdConnect', openIdConnectUrl: 'https://example.com/.well-known/openid-configuration'}]) {
      const document = {security: [{Auth: []}], components: {securitySchemes: {Auth: scheme}}}
      const viewer = mountViewer('/spec.json', '#overview', {setup() {
        provide(documentKey, ref(document))
        provideMediaTypeSelections()
        return () => h(Examples, {base: 'https://example.com', path: '/files', method: 'get', operation: {}, components: document.components})
      }})
      globalThis.window.setTimeout = () => 0
      try {
        assert.equal(viewer.find(el => el.props['aria-haspopup'] === 'dialog'), undefined)
        for (const sender of ['bash', 'laravel']) {
          viewer.find(el => el.props['aria-label'] === 'Request example sender').props['onUpdate:modelValue'](sender)
          await nextTick()
          await viewer.find(el => ['Copy request example', 'Copied request'].includes(el.props['aria-label'])).props.onClick()
          assert.ok(copied.includes('https://example.com/files'))
          assert.ok(copied.includes('Authorization'))
          assert.ok(copied.includes(scheme.scheme === 'basic' ? 'Basic <base64-credentials>' : 'Bearer <token>'))
          const code = viewer.find(el => el.type === 'code')
          assert.equal(code.text + code.children.map(el => el.text).join(''), copied)
        }
      } finally { viewer.close() }
    }
  } finally {
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

test('Stripe-style form encoding renders the operation instead of the error page', async () => {
  const original = globalThis.fetch
  const path = '/v1/payment_records/{id}/report_payment_attempt_informational'
  const specification = {...valid, info: {title: 'Stripe API', version: '1'}, paths: {[path]: {post: {
    operationId: 'reportPaymentAttempt',
    summary: 'Report a payment attempt',
    parameters: [{name: 'id', in: 'path', required: true, schema: {type: 'string'}}],
    requestBody: {content: {'application/x-www-form-urlencoded': {
      schema: {type: 'object', properties: {description: {type: 'string', description: 'Payment description'}}},
      encoding: {description: {explode: true, style: 'deepObject'}},
    }}},
    responses: {200: {description: 'OK'}},
  }}}}
  globalThis.fetch = async () => new Response(JSON.stringify(specification))
  const viewer = mountViewer('/stripe.json', '#operations/reportPaymentAttempt')
  try {
    await until(() => viewer.text().includes('Request Body'))
    assert.match(viewer.text(), /Stripe API/)
    assert.match(viewer.text(), /Report a payment attempt/)
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
