import assert from 'node:assert/strict'
import {after, test} from 'node:test'
import {createServer as createHttpServer} from 'node:http'
import {createServer} from 'vite'
import {createSSRApp, h, provide, ref} from 'vue'
import {renderToString} from 'vue/server-renderer'

const server = await createServer({server: {middlewareMode: true, hmr: {server: createHttpServer()}}})
after(() => server.close())
const {default: Schema} = await server.ssrLoadModule('/src/components/OpenApi/Schema.vue')
const {default: Pages} = await server.ssrLoadModule('/src/components/Layouts/Pages.vue')
const {documentKey} = await server.ssrLoadModule('/src/utils/symbols.ts')
const {getSchemaTypeParts} = await server.ssrLoadModule('/src/components/OpenApi/schemaTypePreview.ts')

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
