import assert from 'node:assert/strict'
import {existsSync, readFileSync} from 'node:fs'
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
    const {descriptor} = parseVue(source, {filename: id})
    if (!descriptor.script && !descriptor.scriptSetup) {
      return compileTemplate({source: descriptor.template.content, filename: id, id}).code + '\nexport default {render}'
    }
    const compiled = compileScript(descriptor, {id, inlineTemplate: true, fs: {
      fileExists: existsSync,
      readFile: file => readFileSync(file, 'utf8'),
    }})
    return transformWithEsbuild(compiled.content, id, {loader: 'ts'})
  },
}], server: {middlewareMode: true, hmr: {server: createHttpServer()}}})
after(() => server.close())
const {renderDescription} = await server.ssrLoadModule('/src/components/OpenApi/descriptionHtml.ts')
const {parseSpecification, fetchSpecification} = await server.ssrLoadModule('/src/components/OpenApi/specification.ts')
const {parseGuides} = await server.ssrLoadModule('/src/guides.ts')
const {default: Viewer} = await server.ssrLoadModule('/src/components/FabricViewer.vue')
const {default: ApiBrand} = await server.ssrLoadModule('/src/components/OpenApi/ApiBrand.vue')
const {theme} = await server.ssrLoadModule('/src/utils/theme.ts')
const {default: Examples} = await server.ssrLoadModule('/src/components/OpenApi/Examples.vue')
const {documentKey} = await server.ssrLoadModule('/src/utils/symbols.ts')
const {provideMediaTypeSelections} = await server.ssrLoadModule('/src/components/OpenApi/useMediaType.ts')
const valid = {openapi: '3.0.3', info: {title: 'Recovered API', version: '1.0'}, paths: {}}

test('guides use frontmatter titles, order, and groups while retaining Markdown', () => {
  const guides = parseGuides({
    errors: '---\ntitle: Errors\norder: 3\n---\nError body',
    auth: '---\ntitle: Authentication\norder: 1\ngroup: security\n---\n**Token**',
    pagination: '---\r\ntitle: Pagination\r\norder: 2\r\n---\r\nPage body',
    plain: 'Plain Markdown',
    last: '---\ntitle: Last\n---\nLast body',
  })
  assert.deepEqual(guides.map(guide => guide.title), ['Authentication', 'Pagination', 'Errors', 'plain', 'Last'])
  assert.equal(guides[0].id, 'guides/auth')
  assert.equal(guides[0].content, '**Token**')
  assert.equal(guides[1].content, 'Page body')
  assert.equal(guides[3].content, 'Plain Markdown')
  assert.equal(guides[0].group, 'security')
  assert.equal(guides[3].group, undefined)
  assert.equal(parseGuides({blank: '---\ngroup: "  "\n---\nContent'})[0].group, undefined)
  assert.deepEqual(parseGuides(), [])
  assert.equal(parseGuides({'a/b': 'Content'})[0].id, 'guides/a%2Fb')
})

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

test('Markdown callouts support inline bodies and all standard alert types', () => {
  const html = renderDescription('> [!NOTE] If the commit identified by `target_commitish` modifies workflows, this endpoint returns **404 Not Found**.')
  assert.match(html, /<blockquote class="markdown-callout markdown-callout-note" aria-label="Note">/)
  assert.match(html, /<svg class="markdown-callout-icon"[^>]*aria-hidden="true">/)
  assert.match(html, /<circle cx="12" cy="12" r="10"/)
  assert.doesNotMatch(html, /markdown-callout-title/)
  assert.match(html, /<p>If the commit identified by <code>target_commitish<\/code>/)
  assert.match(html, /<strong>404 Not Found<\/strong>/)
  assert.doesNotMatch(html, /\[!NOTE\]/)
  const icons = new Set()
  for (const type of ['NOTE', 'TIP', 'IMPORTANT', 'WARNING', 'CAUTION']) {
    const result = renderDescription(`> [!${type}]\n> First paragraph.\n>\n> - A list item\n>\n> Second paragraph.`)
    assert.match(result, new RegExp(`markdown-callout-${type.toLowerCase()}`))
    assert.match(result, /<svg class="markdown-callout-icon"[^>]*aria-hidden="true">/)
    icons.add(result.match(/<svg.*?<\/svg>/)[0])
    assert.doesNotMatch(result, /markdown-callout-title|\[!|FABRIC_CODE_/)
    assert.match(result, /<p>First paragraph\.<\/p>/)
    assert.match(result, /<li>A list item<\/li>/)
    assert.match(result, /<p>Second paragraph\.<\/p>/)
    assert.doesNotMatch(result, /<p><\/p>/)
  }
  assert.equal(icons.size, 5)
})

test('callouts preserve ordinary quotes, nested blocks, code, and sanitization', () => {
  for (const source of ['> Ordinary quote', '> [!UNKNOWN] Text', '> Prefix [!NOTE] Text', '> `[!NOTE]` Text', '```\n> [!NOTE] Text\n```']) {
    assert.doesNotMatch(renderDescription(source), /class="markdown-callout/)
  }
  const html = renderDescription('> [!WARNING]\n>\n> Body.\n>\n> > [!TIP] Nested.\n>\n> ```json\n> {"safe": true}\n> ```\n>\n> <img src="https://example.com/image.png" onerror="alert(1)"><script>alert(1)</script>')
  assert.match(html, /markdown-callout-warning/)
  assert.match(html, /markdown-callout-tip/)
  assert.match(html, /<pre tabindex="0"><code>/)
  assert.doesNotMatch(html, /<p><\/p>|onerror|<script|FABRIC_CODE_/)
  assert.doesNotMatch(renderDescription('<blockquote class="arbitrary" style="color:red">Text</blockquote>'), /class=|style=/)
})

test('Markdown code blocks highlight safely, preserve literal code, and follow the theme', () => {
  const source = '```json\n{"message":"<script>alert(1)</script>","price":"$&"}\n```'
  const light = renderDescription(source, 'light')
  const dark = renderDescription(source, 'dark')
  assert.match(light, /<pre tabindex="0"><code><span style="color:/)
  assert.match(light, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/)
  assert.match(light, /\$&amp;/)
  assert.doesNotMatch(light, /<script|FABRIC_CODE_/)
  assert.notEqual(light, dark)
  const plain = renderDescription('```unknown-language\n<script>alert(1)</script>\n```')
  assert.match(plain, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/)
  assert.doesNotMatch(plain, /<script/)
  assert.match(renderDescription('    const value = 1\n'), /<pre tabindex="0"><code>/)
  assert.doesNotMatch(renderDescription('<span style="color:#ff0000" onclick="alert(1)">Text</span>'), /style=|onclick/)
  assert.doesNotMatch(renderDescription('Inline `code`'), /<pre|style=/)
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

test('viewer passes selected API logo config through and resolves paths against the host', async () => {
  const viewer = mountViewer({
    openApiDocument: JSON.stringify({...valid, info: {...valid.info, title: 'Selected API', 'x-logo': {
      url: 'https://spec.example/logo.svg',
    }}}),
    openApiDocumentUrl: 'https://spec.example/docs/openapi.json',
    logo: {title: 'Custom brand', image: {src: '/brand.svg', alt: ''}, href: '/home'},
  })
  try {
    await until(() => viewer.find(el => el.type === 'img'))
    assert.equal(viewer.find(el => el.type === 'img').props.src, 'https://example.com/brand.svg')
    assert.equal(viewer.find(el => el.props.href === 'https://example.com/home').props.target, '_self')
    viewer.find(el => el.type === 'img').props.onError()
    await nextTick()
    assert.equal(viewer.find(el => el.type === 'img'), undefined)
    assert.ok(viewer.find(el => el.type === 'span' && el.text === 'Custom brand'))
  } finally { viewer.close() }
})

test('branding switches theme images and resets failures when the selected API or config changes', async () => {
  const originalTheme = theme.value
  theme.value = 'light'
  const info = ref({title: 'First API'})
  const logo = ref({image: {src: '/light.svg', srcDark: '/dark.svg', alt: 'Acme', height: 32}})
  const viewer = mountViewer({}, '#overview', {render: () => h(ApiBrand, {info: info.value, logo: logo.value})})
  try {
    assert.equal(viewer.find(el => el.type === 'img').props.src, 'https://example.com/light.svg')
    theme.value = 'dark'
    await nextTick()
    assert.equal(viewer.find(el => el.type === 'img').props.src, 'https://example.com/dark.svg')
    viewer.find(el => el.type === 'img').props.onError()
    await nextTick()
    assert.equal(viewer.find(el => el.type === 'img'), undefined)
    assert.match(viewer.text(), /First API/)
    info.value = {title: 'Second API'}
    await nextTick()
    assert.equal(viewer.find(el => el.type === 'img').props.src, 'https://example.com/dark.svg')
    viewer.find(el => el.type === 'img').props.onError()
    await nextTick()
    logo.value = {image: {src: '/normal.svg', alt: 'Other', height: 24}}
    await nextTick()
    assert.equal(viewer.find(el => el.type === 'img').props.src, 'https://example.com/normal.svg')
    theme.value = 'light'
    await nextTick()
    assert.equal(viewer.find(el => el.type === 'img').props.src, 'https://example.com/normal.svg')
  } finally { viewer.close(); theme.value = originalTheme }
})

function mountViewer(options = {openApiDocumentUrl: '/spec.json'}, hash = '#overview', component) {
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
  const source = ref(typeof options === 'string' ? {openApiDocumentUrl: options} : options)
  const app = renderer.createApp(component ?? {render: () => h(Viewer, {key: source.value, ...source.value})})
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

test('viewer config can hide schema navigation while keeping it visible by default', async () => {
  const document = {...valid, components: {schemas: {Person: {type: 'object', properties: {name: {type: 'string'}}}}}}
  for (const showSchemas of ['omitted', undefined, true, false]) {
    const viewer = mountViewer({openApiDocument: JSON.stringify(document), ...(showSchemas === 'omitted' ? {} : {showSchemas})})
    try {
      await until(() => viewer.text().includes('Recovered API'))
      assert.equal(!!viewer.find(el => el.props['aria-label'] === 'Schemas'), showSchemas !== false)
    } finally { viewer.close() }
  }
})

test('reference heading is visible when config is omitted and can be disabled', async () => {
  for (const referenceLabel of ['omitted', true, false]) {
    const viewer = mountViewer({openApiDocument: JSON.stringify(valid), ...(referenceLabel === 'omitted' ? {} : {referenceLabel})})
    try {
      await until(() => viewer.text().includes('Recovered API'))
      assert.equal(!!viewer.find(el => el.text === 'Reference'), referenceLabel !== false)
    } finally { viewer.close() }
  }
})

test('inline JSON, YAML, and async document loaders render without fetching', async () => {
  const original = globalThis.fetch
  globalThis.fetch = async () => { throw new Error('Inline documents must not be fetched') }
  try {
    const yaml = 'openapi: 3.0.3\ninfo: {title: Recovered API, version: "1"}\npaths: {}'
    for (const source of [JSON.stringify(valid), yaml, async () => yaml]) {
      const viewer = mountViewer({openApiDocument: source})
      try {
        await until(() => viewer.text().includes('Recovered API'))
        assert.doesNotMatch(viewer.text(), /Unable to display this API/)
      } finally { viewer.close() }
    }
  } finally { globalThis.fetch = original }
})

test('a supplied document takes precedence over its URL and uses that URL as its base', async () => {
  const original = globalThis.fetch
  let calls = 0
  globalThis.fetch = async () => { calls++; throw new Error('The document URL must not be fetched') }
  const document = {...valid, servers: [{url: '/v1'}], info: {...valid.info, 'x-logo': {url: './logo.png'}}}
  try {
    for (const source of [JSON.stringify(document), async () => JSON.stringify(document)]) {
      const viewer = mountViewer({openApiDocument: source, openApiDocumentUrl: 'https://upstream.example.com/docs/openapi.yaml'})
      try {
        await until(() => viewer.text().includes('Recovered API'))
        assert.match(viewer.text(), /https:\/\/upstream.example.com\/v1/)
        assert.equal(viewer.find(el => el.type === 'img').props.src, 'https://upstream.example.com/docs/logo.png')
      } finally { viewer.close() }
    }
    assert.equal(calls, 0)
  } finally { globalThis.fetch = original }
})

test('relative document URLs resolve against the host page without fetching supplied documents', async () => {
  const document = {...valid, info: {...valid.info, 'x-logo': {url: './logo.png'}}}
  const viewer = mountViewer({openApiDocument: JSON.stringify(document), openApiDocumentUrl: '/docs/openapi.yaml'})
  try {
    await until(() => viewer.text().includes('Recovered API'))
    assert.equal(viewer.find(el => el.type === 'img').props.src, 'https://example.com/docs/logo.png')
  } finally { viewer.close() }
})

test('a URL passed as document text is parsed rather than fetched', async () => {
  const original = globalThis.fetch
  let calls = 0
  globalThis.fetch = async () => { calls++; return new Response(JSON.stringify(valid)) }
  const viewer = mountViewer({openApiDocument: 'https://example.com/spec.json', openApiDocumentUrl: '/fallback.json'})
  try {
    await until(() => viewer.text().includes('Unable to display this API'))
    assert.equal(calls, 0)
  } finally { viewer.close(); globalThis.fetch = original }
})

test('retry invokes an async document loader again without fetching its self URL', async () => {
  let calls = 0
  const viewer = mountViewer({
    openApiDocument: async () => {
      if (++calls === 1) throw new Error('Temporary failure')
      return JSON.stringify(valid)
    },
    openApiDocumentUrl: 'https://upstream.example.com/openapi.yaml',
  })
  try {
    await until(() => viewer.text().includes('Unable to display this API'))
    viewer.button().props.onClick()
    await until(() => viewer.text().includes('Recovered API'))
    assert.equal(calls, 2)
  } finally { viewer.close() }
})

test('guides appear after Overview, open from navigation or hashes, and sanitize Markdown', async () => {
  const options = {openApiDocument: JSON.stringify(valid), guides: {
    errors: '---\ntitle: Errors\norder: 3\n---\nError guide',
    auth: '---\ntitle: Authentication\norder: 1\n---\n## Tokens\n\n**Keep secrets safe.**<script>alert(1)</script>',
    pagination: '---\ntitle: Pagination\norder: 2\n---\nPage guide',
  }}
  const viewer = mountViewer(options)
  try {
    await until(() => viewer.text().includes('Recovered API'))
    const introduction = viewer.find(el => el.props['aria-label'] === 'Introduction')
    const content = el => el.text + el.children.map(content).join(' ')
    const text = content(introduction)
    assert.ok(text.indexOf('Overview') < text.indexOf('Authentication'))
    assert.ok(text.indexOf('Authentication') < text.indexOf('Pagination'))
    assert.ok(text.indexOf('Pagination') < text.indexOf('Errors'))
    const auth = viewer.find(el => el.props.href === '#guides/auth')
    auth.props.onClick({preventDefault() {}})
    await until(() => viewer.find(el => el.type === 'h1')?.text === 'Authentication')
    assert.equal(viewer.find(el => el.props.href === '#guides/auth').props['aria-current'], 'page')
    const body = viewer.find(el => typeof el.props.innerHTML === 'string')
    assert.match(body.props.innerHTML, /<h2>Tokens<\/h2>/)
    assert.match(body.props.innerHTML, /<strong>Keep secrets safe\.<\/strong>/)
    assert.doesNotMatch(body.props.innerHTML, /<script|alert\(1\)|order:|title:/)
    viewer.find(el => el.props.href === '#overview').props.onClick({preventDefault() {}})
    await until(() => viewer.find(el => el.type === 'h1')?.text === 'Overview')
  } finally { viewer.close() }
  const linked = mountViewer(options, '#guides/pagination')
  try {
    await until(() => linked.find(el => el.type === 'h1')?.text === 'Pagination')
    assert.match(linked.find(el => typeof el.props.innerHTML === 'string').props.innerHTML, /Page guide/)
  } finally { linked.close() }
})

test('grouped guides share tag folders, retain order, and support guide-only groups alongside palette search', async () => {
  const options = {openApiDocument: JSON.stringify({...valid, paths: {
    '/projects': {get: {summary: 'List projects', tags: ['Projects'], responses: {}}},
  }}), guides: {
    auth: '---\ntitle: Authentication\n---\nAuth guide',
    second: '---\ntitle: Updating projects\ngroup: Projects\norder: 2\n---\nUpdate guide',
    first: '---\ntitle: Project basics\ngroup: Projects\norder: 1\n---\nBasics guide',
    events: '---\ntitle: Event guide\ngroup: Events\n---\nEvents body',
  }}
  const text = el => el.text + el.children.map(text).join(' ')
  const viewer = mountViewer(options, '#guides/first')
  try {
    await until(() => viewer.find(el => el.type === 'h1')?.text === 'Project basics')
    const introduction = viewer.find(el => el.props['aria-label'] === 'Introduction')
    assert.match(text(introduction), /Authentication/)
    assert.doesNotMatch(text(introduction), /Project basics|Updating projects|Event guide/)
    assert.equal(viewer.find(el => el.props.href === '#guides/first').props['aria-current'], 'page')
    const navigation = viewer.text()
    assert.ok(navigation.indexOf('Project basics') < navigation.indexOf('Updating projects'))
    assert.ok(navigation.indexOf('Updating projects') < navigation.indexOf('List projects'))
    viewer.find(el => el.props.href === '#guides/second').props.onClick({preventDefault() {}})
    await until(() => viewer.find(el => el.type === 'h1')?.text === 'Updating projects')
    const events = viewer.find(el => el.type === 'button' && text(el).trim() === 'Events')
    assert.ok(events)
    events.props.onClick()
    await nextTick()
    viewer.find(el => el.props.href === '#guides/events').props.onClick({preventDefault() {}})
    await until(() => viewer.find(el => el.type === 'h1')?.text === 'Event guide')
    assert.ok(viewer.find(el => el.type === 'button' && el.props['aria-haspopup'] === 'dialog'))
    assert.ok(viewer.find(el => el.props.href === '#guides/first'))
    assert.match(viewer.text(), /List projects/)
    assert.match(viewer.text(), /Updating projects/)
  } finally { viewer.close() }
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

test('remounting with a new source aborts old requests and keeps the new viewer independent', async () => {
  const original = globalThis.fetch
  let resolveFirst
  let firstSignal
  globalThis.fetch = (url, options) => url === '/first.json'
    ? (firstSignal = options.signal, new Promise(resolve => { resolveFirst = resolve }))
    : Promise.resolve(new Response(JSON.stringify(valid)))
  const viewer = mountViewer('/first.json')
  try {
    viewer.source.value = {openApiDocumentUrl: '/second.json'}
    await until(() => viewer.text().includes('Recovered API'))
    assert.equal(firstSignal.aborted, true)
    resolveFirst(new Response('Bad specification'))
    await new Promise(resolve => setImmediate(resolve))
    await nextTick()
    assert.match(viewer.text(), /Recovered API/)
    assert.doesNotMatch(viewer.text(), /Unable to display/)
  } finally { viewer.close(); globalThis.fetch = original }
})
