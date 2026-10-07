import assert from 'node:assert/strict'
import {after, test} from 'node:test'
import {createServer as createHttpServer} from 'node:http'
import {createServer} from 'vite'
import {createRenderer, createSSRApp, h, provide, ref} from 'vue'
import {renderToString} from 'vue/server-renderer'

const server = await createServer({server: {middlewareMode: true, hmr: {server: createHttpServer()}}})
after(() => server.close())
const {default: Schema} = await server.ssrLoadModule('/src/components/OpenApi/Schema.vue')
const {default: Pages} = await server.ssrLoadModule('/src/components/Layouts/Pages.vue')
const {documentKey} = await server.ssrLoadModule('/src/utils/symbols.ts')
const {getSchemaTypeParts} = await server.ssrLoadModule('/src/components/OpenApi/schemaTypePreview.ts')
const {useMediaType, provideMediaTypeSelections} = await server.ssrLoadModule('/src/components/OpenApi/useMediaType.ts')
const {default: RequestBody} = await server.ssrLoadModule('/src/components/OpenApi/RequestBody.vue')
const {default: ResponseContent} = await server.ssrLoadModule('/src/components/OpenApi/Partials/ResponseContent.vue')
const {default: Examples} = await server.ssrLoadModule('/src/components/OpenApi/Examples.vue')
const {default: Select} = await server.ssrLoadModule('/src/components/UI/Select.vue')
const {resolveOperationBase} = await server.ssrLoadModule('/src/components/OpenApi/servers.ts')
const {getInlineOperations} = await server.ssrLoadModule('/src/components/OpenApi/utils.ts')

test('server resolution respects overrides, defaults, variables and document-relative URLs', () => {
  const root = [{url: 'https://api.converterer.com'}]
  const pathItem = {servers: [{url: 'https://download.converterer.com'}]}
  assert.equal(resolveOperationBase(root, {}, {}), root[0].url)
  assert.equal(resolveOperationBase(root, pathItem, {}), pathItem.servers[0].url)
  assert.equal(resolveOperationBase(root, pathItem, {servers: [{url: 'https://other.example.com'}]}), 'https://other.example.com')
  assert.equal(resolveOperationBase(root, pathItem, {servers: []}), '/')
  assert.equal(resolveOperationBase(undefined, {}, {}), '/')
  assert.equal(resolveOperationBase([], {}, {}, 'https://example.com/docs/openapi.json'), 'https://example.com/')
  assert.equal(resolveOperationBase([{url: 'https://{region}.example.com/{version}', variables: {
    region: {default: 'eu'}, version: {default: 'v2'},
  }}], {}, {}), 'https://eu.example.com/v2')
  assert.equal(resolveOperationBase([{url: '../api'}], {}, {}, 'https://example.com/docs/openapi.json'), 'https://example.com/api')
  assert.equal(resolveOperationBase([{url: '/v1'}], {}, {}, 'https://example.com/docs/openapi.json'), 'https://example.com/v1')
})

test('path metadata never becomes an operation', () => {
  const paths = {'/': {servers: [{url: 'https://download.converterer.com'}], summary: 'Downloads',
    description: 'Download files', parameters: [], post: {operationId: 'download'},
  }}
  assert.deepEqual(getInlineOperations(paths).map(({id, method}) => [id, method]), [['operations/download', 'post']])
})

test('download path server appears in the endpoint and request example', async () => {
  const html = await renderPages({}, '#operations/download', {
    document: {info: {title: 'Converterer'}, servers: [{url: 'https://api.converterer.com'}]},
    paths: {'/': {servers: [{url: 'https://download.converterer.com'}], post: {operationId: 'download'}}},
  })
  assert.match(html, /https:\/\/download.converterer\.com<\/span>\//)
  assert.match(html, /curl -X POST &#39;https:\/\/download.converterer\.com\/&#39;/)
  assert.doesNotMatch(html, /api\.converterer\.com|operations\/get--|operations\/servers/)
})

test('operation server overrides reach request examples after page selection', async () => {
  const html = await renderPages({}, '#operations/selected', {
    document: {info: {title: 'API'}, servers: [{url: 'https://root.example.com'}]},
    documentUrl: 'https://spec.example.com/docs/openapi.json',
    paths: {'/files': {
      servers: [{url: 'https://path.example.com'}],
      get: {operationId: 'selected', servers: [{url: '../{version}/', variables: {version: {default: 'v2'}}}]},
      post: {operationId: 'other'},
    }},
  })
  assert.match(html, /https:\/\/spec.example.com\/v2<\/span>\/files/)
  assert.match(html, /curl -X GET &#39;https:\/\/spec.example.com\/v2\/files&#39;/)
  assert.doesNotMatch(html, /root\.example\.com|path\.example\.com|curl -X POST/)
})

test('request curl sends URL-encoded fields for form content', async () => {
  const html = await renderToString(createSSRApp({render: () => h(Examples, {
    base: '', components: {}, path: '/pet', method: 'post', operation: {
      requestBody: {content: {'application/x-www-form-urlencoded': {example: {
        name: "dog's & cat", category: {id: 1}, photoUrls: ['one', 'two'],
      }}}}, responses: {},
    },
  })}))
  assert.match(html, /Content-Type: application\/x-www-form-urlencoded/)
  assert.match(html, /--data-urlencode &#39;name=dog&#39;\\&#39;&#39;s &amp; cat&#39;/)
  assert.match(html, /--data-urlencode &#39;category=\{&quot;id&quot;:1\}&#39;/)
  assert.match(html, /--data-urlencode &#39;photoUrls=one&#39;/)
  assert.match(html, /--data-urlencode &#39;photoUrls=two&#39;/)
  assert.doesNotMatch(html, / -d /)
})

async function renderReference(target) {
  return renderToString(createSSRApp({render: () => h(Schema, {
    schema: {$ref: '#/components/schemas/MetadataInstanceValue'},
    components: {schemas: {MetadataInstanceValue: target}},
    propertyTitle: 'value',
    level: 1,
  })}))
}

test('renders a referenced oneOf schema without a top-level type', async () => {
  const html = await renderReference({
    description: 'Metadata value.',
    example: 'reviewed',
    oneOf: [{type: 'string'}, {type: 'integer'}, {type: 'number'}, {type: 'array', items: {type: 'string'}}],
  })
  assert.match(html, /Metadata value\./)
  assert.match(html, /reviewed/)
  assert.match(html.replace(/<[^>]*>/g, ''), /string \| integer \| number \| string\[\]/)
})

test('union details distinguish matching rules and expose inline object requirements', async () => {
  const options = [
    {type: 'string', enum: ['a4', 'letter']},
    {type: 'object', required: ['width', 'height'], properties: {
      width: {type: ['string', 'number']}, height: {type: ['string', 'number']},
    }},
  ]
  for (const [keyword, rule] of [['anyOf', 'at least one'], ['oneOf', 'exactly one']]) {
    const html = await renderReference({[keyword]: options, default: 'a4'})
    assert.ok(html.includes(`Must match ${rule} option.`))
    assert.match(html, /role="group" aria-label="value options"/)
    assert.match(html, /Option 1/)
    assert.match(html, /Option 2/)
    const text = html.replace(/<[^>]*>/g, '')
    assert.match(text, /width\s*string\s*\|\s*number\s*required/)
    assert.match(text, /height\s*string\s*\|\s*number\s*required/)
    assert.match(html, /Hide options/)
  }
})

test('renders const constraints, including falsy and structured values', async () => {
  for (const value of ['Pong!', null, false, 0, '', {message: 'Pong!'}]) {
    const html = await renderReference({const: value})
    const text = html.replace(/<[^>]*>/g, '')
    assert.match(text, /Const/)
    const formatted = value === '' ? '&#39;&#39;' : typeof value === 'object' ? JSON.stringify(value) : String(value)
    assert.ok(text.replaceAll('&quot;', '"').includes(formatted))
  }
})

test('accepts other referenced schemas without a top-level type', async () => {
  for (const target of [{}, {anyOf: [{type: 'string'}, {type: 'number'}]}, {description: 'Free-form value.', example: {key: 'value'}}]) {
    const html = await renderReference(target)
    assert.match(html, /MetadataInstanceValue/)
  }
})

async function renderPages(components, hash = '', options = {}) {
  const previousWindow = globalThis.window
  globalThis.window = {location: {href: `http://localhost/${hash}`}}
  try {
    const document = {info: {title: 'API'}, components}
    return await renderToString(createSSRApp({setup() {
      provide(documentKey, ref(document))
      return () => h(Pages, {document, components, paths: {}, base: 'https://api.example.com', ...options})
    }}))
  } finally {
    if (previousWindow === undefined) delete globalThis.window
    else globalThis.window = previousWindow
  }
}

test('only shows schema navigation when component schemas exist', async () => {
  assert.doesNotMatch(await renderPages({}), /aria-label="Schemas"/)
  assert.doesNotMatch(await renderPages({schemas: {}}), /aria-label="Schemas"/)
  assert.match(await renderPages({schemas: {Person: {type: 'object'}}}), /aria-label="Schemas"/)
})

test('direct endpoint view retains accessible property disclosures', async () => {
  const html = await renderPages({}, '#operations/list-files', {paths: {'/files': {get: {
    operationId: 'list-files', summary: 'List files',
    requestBody: {content: {'application/json': {schema: {type: 'object', properties: {
      options: {type: 'object', properties: {name: {type: 'string'}}},
    }}}}},
  }}}})
  assert.match(html, /<h1[^>]*>List files<\/h1>/)
  assert.match(html, /aria-current="page"/)
  assert.match(html, /<button[^>]*type="button"[^>]*aria-expanded="false"[^>]*>\+ Show properties<\/button>/)
})

test('overview is the landing page and renders spec descriptions, metadata and reference links', async () => {
  const html = await renderPages({}, '', {
    document: {openapi: '3.1.0', info: {
      title: 'Files API', version: '2.0', summary: 'Manage your files.',
      description: 'Upload **documents** and organize your workspace.\n\n## Getting started\n\nUse your API key.',
      license: {name: 'MIT', url: 'https://example.com/license'},
      contact: {name: 'Developer support', email: 'api@example.com', url: 'https://example.com/support'},
      termsOfService: 'https://example.com/terms',
    }, externalDocs: {url: 'https://example.com/guides', description: 'Guides'}},
    paths: {'/files': {get: {operationId: 'list-files', tags: ['Files']}, post: {operationId: 'create-file', tags: ['Files']}}},
  })
  assert.match(html, /<h1[^>]*>Overview<\/h1>/)
  assert.match(html, /Upload <strong>documents<\/strong>/)
  assert.match(html, /<h2>Getting started<\/h2>/)
  assert.match(html, /Manage your files\./)
  assert.match(html, /href="#operations\/list-files"/)
  assert.match(html, /2 endpoints/)
  assert.match(html, /OpenAPI 3\.1\.0/)
  assert.match(html, /https:\/\/example.com\/license/)
  assert.match(html, /Developer support/)
  assert.match(html, /mailto:api%40example.com/)
  assert.match(html, /aria-current="page"/)
  const direct = await renderPages({}, '#overview')
  assert.match(direct, /<h1[^>]*>Overview<\/h1>/)
  assert.doesNotMatch(direct, /aria-label="API details"|id="overview-auth"|id="overview-reference"/)
})

test('editorial is the only overview and old variant links still open it', async () => {
  for (const hash of ['#overview', '#overview/editorial', '#overview/xai']) {
    const html = await renderPages({}, hash, {
      document: {info: {title: 'Files', description: 'Manage **files**.', version: '1.0'}},
      paths: {'/files': {get: {operationId: 'list', tags: ['Files']}}},
    })
    assert.match(html, /max-w-\[72ch\]/)
    assert.match(html, /Manage <strong>files<\/strong>/)
    assert.match(html, /href="#operations\/list"/)
    assert.equal((html.match(/href="#overview"/g) ?? []).length, 1)
    assert.match(html, /href="#overview"[^>]*aria-current="page"/)
    assert.doesNotMatch(html, /Overview ·|overview--|Authenticate with/)
    assert.equal((html.match(/<h1[ >]/g) ?? []).length, 1)
  }
})

test('overview includes server overrides, resolves templates and renders declared authentication', async () => {
  const html = await renderPages({securitySchemes: {
    ApiKey: {type: 'http', scheme: 'basic', description: 'Use your API key as the username.'},
  }}, '#overview', {
    document: {info: {title: 'API'}, servers: [{url: '/{version}', variables: {version: {default: 'v2'}}}]},
    documentUrl: 'https://api.example.com/docs/openapi.json',
    paths: {
      '/files': {servers: [{url: 'https://download.example.com'}], post: {operationId: 'download'}},
      '/status': {get: {operationId: 'status', servers: [{url: 'https://download.example.com'}]}},
    },
  })
  assert.match(html, /https:\/\/api.example.com\/v2/)
  assert.equal((html.match(/https:\/\/download.example.com/g) ?? []).length, 1)
  assert.match(html, /HTTP Basic/)
  assert.match(html, /Use your API key as the username\./)
  assert.doesNotMatch(html, /Bearer token/)
})

test('opens schema hashes and renders the title, description and tabbed example', async () => {
  const html = await renderPages({schemas: {'Person/Details': {
    title: 'Person details', description: 'A person in the workspace.', type: 'object', properties: {id: {type: 'integer', example: 42}},
  }}}, '#schemas/Person%2FDetails')
  assert.match(html, /<h1[^>]*>Person details<\/h1>/)
  assert.equal((html.match(/A person in the workspace\./g) ?? []).length, 1)
  assert.match(html, /JSON schema/)
  assert.match(html, /Typescript/)
  assert.match(html, /&quot;id&quot;: 42/)
  assert.match(html, /aria-current="page"/)
})

test('showSchemas controls schema navigation and request, response and property links', async () => {
  const components = {schemas: {
    Person: {type: 'object', properties: {name: {type: 'string'}}},
    Envelope: {type: 'object', properties: {owner: {$ref: '#/components/schemas/Person'}}},
  }}
  const paths = {'/people': {post: {
    operationId: 'create-person',
    requestBody: {content: {'application/json': {schema: {type: 'array', items: {$ref: '#/components/schemas/Person'}}}}},
    responses: {200: {description: 'Success', content: {'application/json': {schema: {$ref: '#/components/schemas/Envelope'}}}}},
  }}}
  const enabled = await renderPages(components, '#operations/create-person', {paths, showSchemas: true})
  assert.match(enabled, /href="#schemas\/Person"/)
  assert.match(enabled, /href="#schemas\/Envelope"/)
  assert.match(enabled, /text-inherit no-underline hover:cursor-pointer hover:underline/)
  const disabled = await renderPages(components, '#operations/create-person', {paths, showSchemas: false})
  assert.doesNotMatch(disabled, /aria-label="Schemas"|href="#schemas\//)
  assert.match(disabled, /Person/)
  const schemaPage = await renderPages(components, '#schemas/Envelope')
  assert.match(schemaPage, /href="#schemas\/Person"/)
})

test('type parts preserve arrays, tuples and escaped component names', () => {
  assert.deepEqual(getSchemaTypeParts({type: 'array', items: {$ref: '#/components/schemas/Person'}}), [{text: 'Person', schemaName: 'Person'}, {text: '[]'}])
  assert.deepEqual(getSchemaTypeParts({type: 'array', prefixItems: [{$ref: '#/components/schemas/Person'}, {type: 'string'}]}), [{text: '['}, {text: 'Person', schemaName: 'Person'}, {text: ', '}, {text: 'string'}, {text: ']'}])
  assert.deepEqual(getSchemaTypeParts({$ref: '#/components/schemas/Person~1Details'}), [{text: 'Person~1Details', schemaName: 'Person/Details'}])
})

test('shows array union types and renders each included resource variant', async () => {
  const components = {schemas: {
    ComponentGroup: {type: 'object', properties: {id: {type: 'string'}}},
    Incident: {type: 'object', properties: {id: {type: 'string'}}},
  }}
  const schema = {type: 'array', items: {anyOf: [{$ref: '#/components/schemas/ComponentGroup'}, {$ref: '#/components/schemas/Incident'}]}}
  assert.equal(getSchemaTypeParts(schema).map(part => part.text).join(''), '(ComponentGroup | Incident)[]')
  const html = await renderToString(createSSRApp({render: () => h(Schema, {schema, components, propertyTitle: 'included', level: 1})}))
  const text = html.replace(/<[^>]*>/g, '')
  assert.match(text, /\(ComponentGroup \| Incident\)\[\]/)
  assert.ok((text.match(/ComponentGroup/g) ?? []).length >= 2)
  assert.ok((text.match(/Incident/g) ?? []).length >= 2)
})

test('content type selection changes media and handles changing or empty content', () => {
  const json = {schema: {type: 'object'}, example: {message: 'JSON'}}
  const xml = {schema: {type: 'string'}, example: '<message>XML</message>'}
  const content = ref({'application/json': json, 'application/xml': xml})
  const selection = useMediaType(() => content.value)
  assert.equal(selection.type.value, 'application/json')
  assert.deepEqual(selection.media.value, json)
  selection.type.value = 'application/xml'
  assert.deepEqual(selection.media.value, xml)
  content.value = {'text/plain': {example: 'text'}}
  assert.equal(selection.type.value, 'text/plain')
  assert.equal(selection.media.value.example, 'text')
  content.value = {}
  assert.equal(selection.type.value, '')
  assert.equal(selection.media.value, undefined)
})

test('body views render one schema with a borderless content type picker', async () => {
  const content = {
    'application/json': {schema: {type: 'object', properties: {jsonProperty: {type: 'string'}}}},
    'application/xml': {schema: {type: 'object', properties: {xmlProperty: {type: 'string'}}}},
  }
  for (const [component, props, label] of [
    [RequestBody, {requestBody: {content}}, 'Request body content type'],
    [ResponseContent, {unreferencedResponse: {description: 'Success', content}}, 'Response body content type'],
  ]) {
    const html = await renderToString(createSSRApp({render: () => h(component, {components: {}, ...props})}))
    assert.match(html, new RegExp(`aria-label="${label}"`))
    assert.match(html, /border-0 bg-transparent/)
    assert.match(html, /title="application\/json"/)
    assert.match(html, /<option value="application\/json"/)
    assert.match(html, /<option value="application\/xml"/)
    assert.match(html, /jsonProperty/)
    assert.doesNotMatch(html, /xmlProperty/)
  }
})

test('example panels use the selected media without content type pickers', async () => {
  const content = {
    'application/json': {example: {message: 'JSON example'}},
    'application/xml': {example: '<message>XML example</message>'},
  }
  const html = await renderToString(createSSRApp({render: () => h(Examples, {
    components: {}, base: 'https://example.com', path: '/messages', method: 'post',
    operation: {requestBody: {content}, responses: {200: {description: 'Success', content}}},
  })}))
  assert.doesNotMatch(html, /aria-label="(?:Request|Response) example content type"/)
  assert.match(html, /Content-Type: application\/json/)
  assert.match(html, /JSON example/)
  assert.doesNotMatch(html, /XML example/)
})

test('response payload format follows its documentation selection independently of the request', async () => {
  const content = {
    'application/json': {example: {message: 'JSON response'}},
    'application/xml': {example: '<message>XML response</message>'},
  }
  for (const selected of Object.keys(content)) {
    const Consumer = {setup() {
      useMediaType(() => content, () => 'response:200').type.value = selected
      return () => h(Examples, {
        components: {}, base: 'https://example.com', path: '/messages', method: 'post',
        operation: {requestBody: {content}, responses: {200: {description: 'Success', content}}},
      })
    }}
    const html = await renderToString(createSSRApp({setup() {
      provideMediaTypeSelections()
      return () => h(Consumer)
    }}))
    const request = html.split('aria-label="Request example"')[1].split('</section>')[0]
    const response = html.split('aria-label="Response example"')[1].split('</section>')[0]
    assert.match(request, /Content-Type: application\/json/)
    assert.doesNotMatch(request, /XML response/)
    if (selected === 'application/xml') {
      assert.match(response, /&lt;message&gt;XML response&lt;\/message&gt;/)
      assert.doesNotMatch(response, /JSON response/)
    } else {
      assert.match(response, /&quot;message&quot;: &quot;JSON response&quot;/)
      assert.doesNotMatch(response, /XML response/)
    }
  }
})

test('documentation and examples share selections separately for requests and each response status', async () => {
  const content = {'application/json': {example: 'JSON'}, 'application/xml': {example: 'XML'}}
  const status = ref('200')
  let selections
  const Consumer = {setup() {
    selections = {
      requestDocs: useMediaType(() => content, () => 'request'),
      requestExample: useMediaType(() => content, () => 'request'),
      successDocs: useMediaType(() => content, () => 'response:200'),
      errorDocs: useMediaType(() => content, () => 'response:400'),
      responseExample: useMediaType(() => content, () => `response:${status.value}`),
    }
    return () => h('div')
  }}
  const renderer = createRenderer({
    createElement: () => ({}), createText: () => ({}), createComment: () => ({}),
    insert() {}, remove() {}, setText() {}, setElementText() {}, patchProp() {},
    parentNode: () => null, nextSibling: () => null,
  })
  const app = renderer.createApp({setup() {
    provideMediaTypeSelections()
    return () => h(Consumer)
  }})
  app.mount({})
  selections.requestDocs.type.value = 'application/xml'
  assert.equal(selections.requestExample.media.value.example, 'XML')
  assert.equal(selections.responseExample.media.value.example, 'JSON')
  selections.successDocs.type.value = 'application/xml'
  assert.equal(selections.responseExample.media.value.example, 'XML')
  status.value = '400'
  assert.equal(selections.responseExample.media.value.example, 'JSON')
  status.value = '200'
  assert.equal(selections.responseExample.media.value.example, 'XML')
  app.unmount()
})

test('a single select option renders plain text without a dropdown or chevron', async () => {
  const html = await renderToString(createSSRApp({render: () => h(Select, {
    modelValue: 'application/json', options: [{value: 'application/json', label: 'application/json'}],
    class: 'text-gray-500', 'aria-label': 'Content type',
  })}))
  assert.match(html, /application\/json/)
  assert.match(html, /text-gray-500/)
  assert.doesNotMatch(html, /<select|<svg/)
})

test('request curl and response examples serialize selected XML schemas', async () => {
  const components = {schemas: {Pet: {type: 'object', xml: {name: 'pet'}, properties: {
    id: {type: 'integer', example: 7, xml: {attribute: true}},
    name: {type: 'string', example: 'doggie'},
  }}}}
  const content = {'application/xml': {schema: {$ref: '#/components/schemas/Pet'}}}
  const html = await renderToString(createSSRApp({render: () => h(Examples, {
    components, base: 'https://example.com', path: '/pets', method: 'post',
    operation: {requestBody: {content}, responses: {200: {description: 'Success', content}}},
  })}))
  assert.match(html, /Content-Type: application\/xml/)
  assert.match(html, /Bash/)
  assert.match(html, /aria-label="Request example sender"/)
  assert.match(html, /<option value="laravel">Laravel<\/option>/)
  assert.match(html, /<option value="payload">XML<\/option>/)
  assert.doesNotMatch(html, /<option value="payload">JSON<\/option>/)
  assert.equal((html.match(/&lt;pet id=&quot;7&quot;&gt;/g) ?? []).length, 2)
  assert.equal((html.match(/&lt;name&gt;doggie&lt;\/name&gt;/g) ?? []).length, 2)
})

test('request curl includes a generated JSON payload when no explicit example exists', async () => {
  const content = {'application/json': {schema: {type: 'object', properties: {
    name: {type: 'string', default: 'doggie'}, enabled: {type: 'boolean'},
  }}}}
  const html = await renderToString(createSSRApp({render: () => h(Examples, {
    components: {}, base: 'https://example.com', path: '/pets', method: 'post',
    operation: {requestBody: {content}},
  })}))
  assert.match(html, /Content-Type: application\/json/)
  assert.match(html, /-d &#39;\{/)
  assert.match(html, /&quot;name&quot;: &quot;doggie&quot;/)
  assert.match(html, /&quot;enabled&quot;: true/)
})

test('request picker offers only the payload format matching the selected content type', async () => {
  for (const [type, label] of [
    ['application/json', 'JSON'], ['Application/Problem+JSON; charset=utf-8', 'JSON'],
    ['text/json', 'JSON'], ['application/xml', 'XML'], ['application/problem+xml', 'XML'],
    ['text/xml; charset=utf-8', 'XML'], ['application/x-www-form-urlencoded', null],
    ['multipart/form-data', null], ['', null],
  ]) {
    const html = await renderToString(createSSRApp({render: () => h(Examples, {
      components: {}, base: 'https://example.com', path: '/pets', method: 'post',
      operation: {requestBody: type ? {content: {[type]: {example: {name: 'doggie'}}}} : undefined},
    })}))
    assert.match(html, /<option value="bash"[^>]*>Bash<\/option>/)
    assert.match(html, /<option value="laravel">Laravel<\/option>/)
    if (label) {
      assert.ok(html.includes(`<option value="payload">${label}</option>`))
      assert.ok(!html.includes(`<option value="payload">${label === 'JSON' ? 'XML' : 'JSON'}</option>`))
    } else assert.doesNotMatch(html, /<option value="payload">/)
  }
})
