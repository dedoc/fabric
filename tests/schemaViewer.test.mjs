import assert from 'node:assert/strict'
import {after, test} from 'node:test'
import {readFile} from 'node:fs/promises'
import {createServer as createHttpServer} from 'node:http'
import {createServer} from 'vite'
import React from 'react'
import {act} from 'react'
import {createRoot} from 'react-dom/client'
import {renderToStaticMarkup} from 'react-dom/server'
import {JSDOM} from 'jsdom'

const testDom = new JSDOM('<!doctype html><html><body></body></html>', {url: 'https://example.com/', pretendToBeVisual: true})
const testDomGlobals = ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'MouseEvent', 'MutationObserver', 'requestAnimationFrame', 'cancelAnimationFrame', 'getComputedStyle']
const originalDomGlobals = new Map(testDomGlobals.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]))
for (const name of testDomGlobals) {
  const value = name === 'window' ? testDom.window : name === 'document' ? testDom.window.document : testDom.window[name]
  if (value !== undefined) Object.defineProperty(globalThis, name, {configurable: true, writable: true, value})
}

const server = await createServer({configFile: false, resolve: {alias: {'@': new URL('../src', import.meta.url).pathname}}, server: {middlewareMode: true, hmr: {server: createHttpServer()}}})
after(() => {
  server.close()
  testDom.window.close()
  for (const [name, descriptor] of originalDomGlobals) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor)
    else delete globalThis[name]
  }
})
const {DocumentContext, ShowSchemasContext, OperationSelectionsProvider} = await server.ssrLoadModule('/src/react/context.tsx')
const h = React.createElement
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const renderToString = element => renderToStaticMarkup(element)
async function openOptions(mounted, label) {
  const trigger = mounted.container.querySelector(`[aria-label="${label}"]`)
  assert.ok(trigger, `Expected a selectable control named ${label}`)
  await act(async () => {
    trigger.dispatchEvent(new window.MouseEvent('click', {bubbles: true, cancelable: true}))
    await new Promise(resolve => window.requestAnimationFrame(() => resolve()))
  })
  return [...globalThis.document.querySelectorAll('[role="option"]')].map(item => item.textContent.trim())
}
async function mountReact(element) {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', {url: 'https://example.com/', pretendToBeVisual: true})
  const names = ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'MouseEvent', 'MutationObserver', 'requestAnimationFrame', 'cancelAnimationFrame', 'getComputedStyle']
  const previous = new Map(names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]))
  for (const name of names) {
    const value = name === 'window' ? dom.window : name === 'document' ? dom.window.document : dom.window[name]
    if (value !== undefined) Object.defineProperty(globalThis, name, {configurable: true, writable: true, value})
  }
  const container = dom.window.document.getElementById('root')
  const root = createRoot(container)
  await act(async () => root.render(element))
  return {
    container,
    async render(next) { await act(async () => root.render(next)) },
    async unmount() {
      await act(async () => root.unmount())
      dom.window.close()
      for (const [name, descriptor] of previous) {
        if (descriptor) Object.defineProperty(globalThis, name, descriptor)
        else delete globalThis[name]
      }
    },
  }
}
// Keep content assertions independent of syntax highlighting spans.
const withoutHighlighting = html => html.replace(/(<code\b[^>]*>)(.*?)(<\/code>)/gs, (_, open, code, close) => open + code.replace(/<\/?span\b[^>]*>|<!--.*?-->/gs, '') + close)
const parseHtml = html => new JSDOM(html).window.document
const textContent = html => parseHtml(html).body.textContent.replace(/\s+/g, ' ').trim()
const {default: Schema} = await server.ssrLoadModule('/src/components/OpenApi/Schema.tsx')
const {default: Pages} = await server.ssrLoadModule('/src/components/Layouts/Pages.tsx')
const {default: ApiBrand} = await server.ssrLoadModule('/src/components/OpenApi/ApiBrand.tsx')
const {parseSpecification} = await server.ssrLoadModule('/src/core/openapi/specification.ts')
const {getSchemaTypeParts} = await server.ssrLoadModule('/src/core/openapi/schemaTypePreview.ts')
const {useMediaType, useCompositionSelections, useCompositionExample} = await server.ssrLoadModule('/src/react/context.tsx')
const {default: RequestBody} = await server.ssrLoadModule('/src/components/OpenApi/RequestBody.tsx')
const {default: ResponseContent} = await server.ssrLoadModule('/src/components/OpenApi/Partials/ResponseContent.tsx')
const {default: Examples} = await server.ssrLoadModule('/src/components/OpenApi/Examples.tsx')
const {resolveOperationBase} = await server.ssrLoadModule('/src/core/openapi/servers.ts')
const {getInlineOperations, getWebhookOperations} = await server.ssrLoadModule('/src/core/openapi/utils.ts')
const {default: OperationDatums} = await server.ssrLoadModule('/src/components/OpenApi/Partials/OperationDatums.tsx')
const {default: SecuritySchemeDetails} = await server.ssrLoadModule('/src/components/OpenApi/Partials/SecuritySchemeDetails.tsx')
const {operationSecurity, resolveSecurityScheme, authorizationHeaderExample} = await server.ssrLoadModule('/src/core/openapi/security.ts')
const {createRequestExample} = await server.ssrLoadModule('/src/core/openapi/requestExamples/index.ts')
const {resolveReference} = await server.ssrLoadModule('/src/core/openapi/references.ts')
const {resolveExampleSchema, createSchemaExample} = await server.ssrLoadModule('/src/core/openapi/schemaExamples.ts')
const referenceFixture = JSON.parse(await readFile(new URL('./fixtures/local-references.json', import.meta.url), 'utf8'))
const requestFixture = parseSpecification(await readFile(new URL('../public/specs/fabric-reference.yaml', import.meta.url), 'utf8'))
const {effectiveParameters} = await server.ssrLoadModule('/src/core/openapi/parameters.ts')
const {default: ParameterDetails} = await server.ssrLoadModule('/src/components/OpenApi/ParameterDetails.tsx')
const {selectExampleSchema, compositionPathKey} = await server.ssrLoadModule('/src/core/openapi/compositionExamples.ts')
const {getSchemaBounds} = await server.ssrLoadModule('/src/core/openapi/schemaBounds.ts')
const {schemaDisplay} = await server.ssrLoadModule('/src/core/openapi/schemaDisplay.ts')

test('allOf displays inherited and local properties once at the root without changing source examples', async () => {
  const document = {openapi: '3.1.0', components: {schemas: {Base: {
    type: 'object', required: ['id'], properties: {id: {type: 'string', minLength: 2}, secret: {type: 'string', writeOnly: true}},
  }}}}
  const schema = {properties: {local: {type: 'boolean'}}, allOf: [
    {$ref: '#/components/schemas/Base'},
    {type: 'object', required: ['local'], properties: {id: {maxLength: 10}, extra: {type: 'number'}}},
  ]}
  const before = JSON.stringify({document, schema})
  const exampleBefore = createSchemaExample(schema, document.components, document)
  const display = schemaDisplay(schema, document)
  assert.deepEqual([...display.properties.keys()], ['local', 'id', 'secret', 'extra'])
  assert.deepEqual([...display.required], ['id', 'local'])
  const html = await renderWithDocument(Schema, {schema, components: document.components, direction: 'response', shouldHideMainType: true}, document)
  assert.doesNotMatch(html, /Must match all schemas|Show properties|Hide properties/)
  assert.equal((html.match(/>id<\/div>/g) ?? []).length, 1)
  assert.equal((html.match(/>required<\/div>/g) ?? []).length, 2)
  assert.match(html, /2 characters/)
  assert.match(html, /10 characters/)
  assert.match(html, />extra<\/div>/)
  assert.doesNotMatch(html, />secret<\/div>/)
  assert.equal(JSON.stringify({document, schema}), before)
  assert.deepEqual(createSchemaExample(schema, document.components, document), exampleBefore)
})

test('allOf property descriptions override referenced descriptions and fall back when absent', async () => {
  const document = {openapi: '3.0.3', components: {schemas: {EventAttendee: {
    type: 'object', description: 'An attendee of the event', properties: {
      name: {type: 'string', description: 'The attendee name'},
    },
  }}}}
  for (const description of ['The organizer of the event', undefined, '']) {
    const organizer = {
      allOf: [{$ref: '#/components/schemas/EventAttendee'}],
      type: 'object', nullable: true,
      ...(description === undefined ? {} : {description}),
    }
    const schema = {type: 'object', properties: {organizer}}
    const before = JSON.stringify({document, schema})
    const html = await renderWithDocument(Schema, {schema, components: document.components, level: 0}, document)
    if (description) assert.equal((html.match(/The organizer of the event/g) ?? []).length, 1)
    if (description === undefined) assert.equal((html.match(/An attendee of the event/g) ?? []).length, 1)
    else assert.doesNotMatch(html, /An attendee of the event/)
    assert.match(html, /The attendee name/)
    assert.equal(JSON.stringify({document, schema}), before)
  }
})

test('allOf preserves original selection paths for duplicate fields, maps and array items', () => {
  const alternative = {oneOf: [{type: 'string'}, {type: 'number'}]}
  const schema = {allOf: [
    {properties: {value: alternative}, additionalProperties: alternative, items: alternative},
    {properties: {value: {description: 'Extra constraint'}}, additionalProperties: {maxLength: 5}, items: {minimum: 0}},
  ]}
  const display = schemaDisplay(schema, {}, ['properties', 'nested'])
  for (const [field, keyword] of [[display.properties.get('value'), 'properties'], [display.additionalProperties, 'additionalProperties'], [display.items, 'items']]) {
    const tail = keyword === 'properties' ? ['properties', 'value'] : [keyword]
    assert.deepEqual(field.allOfPaths, [0, 1].map(index => ['properties', 'nested', 'allOf', index, ...tail]))
    const nested = schemaDisplay(field.schema, {}, field.path, field.allOfPaths)
    assert.deepEqual(nested.layers[1].path, field.allOfPaths[0])
    assert.equal(nested.layers[1].schema.oneOf, alternative.oneOf)
  }
})

test('numeric bounds preserve exclusivity, zero and the strongest applicable endpoint', () => {
  const cases = [
    [{minimum: 0, maximum: 10, exclusiveMinimum: true, exclusiveMaximum: true}, {minimum: {value: 0, exclusive: true}, maximum: {value: 10, exclusive: true}}, 'number(0..10)'],
    [{minimum: 0, maximum: 0, exclusiveMinimum: false, exclusiveMaximum: false}, {minimum: {value: 0, exclusive: false}, maximum: {value: 0, exclusive: false}}, 'number[0]'],
    [{exclusiveMinimum: 0, exclusiveMaximum: 1}, {minimum: {value: 0, exclusive: true}, maximum: {value: 1, exclusive: true}}, 'number(0..1)'],
    [{minimum: 5, exclusiveMinimum: 3, maximum: 10, exclusiveMaximum: 12}, {minimum: {value: 5, exclusive: false}, maximum: {value: 10, exclusive: false}}, 'number[5..10]'],
    [{minimum: -5, exclusiveMinimum: -5, maximum: 0, exclusiveMaximum: 0}, {minimum: {value: -5, exclusive: true}, maximum: {value: 0, exclusive: true}}, 'number(-5..0)'],
    [{exclusiveMinimum: true}, {minimum: undefined, maximum: undefined}, 'number'],
  ]
  for (const [constraints, bounds, text] of cases) {
    const schema = {type: 'number', ...constraints}
    assert.deepEqual(getSchemaBounds(schema), bounds)
    assert.equal(getSchemaTypeParts(schema).map(part => part.text).join(''), text)
  }
})

test('constraint display keeps patterns literal and array zero limits visible', async () => {
  const pattern = '^<script>[a-z]+\\d{2}</script>$'
  const html = await renderWithDocument(Schema, {components: {}, schema: {type: 'string', pattern, minLength: 0, maxLength: 20}}, {})
  assert.match(html, /Pattern/)
  assert.match(html, /&lt;script&gt;\[a-z\]\+/)
  assert.ok(html.includes('\\d{2}'))
  assert.doesNotMatch(html, /<script>/)
  assert.match(html, /&gt;=<\/span> 0 characters/)
  assert.match(html, /&lt;=<\/span> 20 characters/)
  const emptyPattern = await renderWithDocument(Schema, {components: {}, schema: {type: 'string', pattern: ''}}, {})
  assert.match(emptyPattern, /Pattern/)
  for (const uniqueItems of [true, false]) {
    const array = await renderWithDocument(Schema, {components: {}, schema: {type: 'array', minItems: 0, maxItems: 0, uniqueItems, items: {}}}, {})
    assert.match(array, /&gt;=<\/span> 0 items/)
    assert.match(array, /&lt;=<\/span> 0 items/)
    if (uniqueItems) assert.match(array, /unique items/)
    else assert.doesNotMatch(array, /unique items/)
  }
})

test('reference lab fixtures display 3.0 and 3.1 numeric bounds and nested constraints', async () => {
  const schema = requestFixture.components.schemas.SchemaLab
  const html = await renderWithDocument(Schema, {schema, components: requestFixture.components}, requestFixture)
  assert.match(html, /Pattern/)
  assert.ok(html.includes('^[a-z][a-z0-9_-]{2,15}$'))
  assert.match(html, /&gt;<\/span> 0/)
  assert.match(html, /&lt;<\/span> 1/)
  assert.match(html, /unique items/)
  assert.match(html, /&gt;=<\/span> 2 items/)
  assert.match(html, /&lt;=<\/span> 4 items/)
  const legacy = parseSpecification(await readFile(new URL('../public/specs/fabric-reference-3.0.yaml', import.meta.url), 'utf8'))
  const legacyHtml = await renderWithDocument(Schema, {schema: legacy.components.schemas.NullableRecord, components: legacy.components}, legacy)
  assert.match(legacyHtml, /&gt;<\/span> 0/)
  assert.match(legacyHtml, /&lt;<\/span> 10/)
  assert.match(legacyHtml, /&gt;=<\/span> 0/)
  assert.match(legacyHtml, /&lt;=<\/span> 10/)
})

test('unsupported discriminator metadata adds no schema-keyword UI warning', async () => {
  const schema = {oneOf: [{type: 'string'}, {type: 'number'}], discriminator: {propertyName: 'kind', mapping: {text: '#/components/schemas/Text'}}}
  const html = await renderWithDocument(Schema, {schema, components: {}}, {})
  assert.match(html, /aria-label="one of"/)
  assert.doesNotMatch(html, /role="alert"|discriminator|Unsupported/)
})

test('effective parameters resolve aliases before replacing by name/location and preserve unresolved entries', () => {
  const inherited = {name: 'view', in: 'query', required: true, example: 'old', description: 'Inherited'}
  const override = {name: 'view', in: 'query', example: 'new'}
  const header = {name: 'view', in: 'header', example: 'editor'}
  const document = {components: {parameters: {Inherited: inherited, Alias: {$ref: '#/components/parameters/Inherited'}, Override: override}}}
  for (const [shared, own] of [
    [[{$ref: '#/components/parameters/Alias'}], [override, header]],
    [[inherited], [{$ref: '#/components/parameters/Override'}, header]],
  ]) {
    const before = JSON.stringify({document, shared, own})
    const values = effectiveParameters(shared, own, document)
    assert.deepEqual(values, [override, header])
    assert.equal(values[0].required, undefined)
    assert.equal(values[0].description, undefined)
    assert.equal(JSON.stringify({document, shared, own}), before)
  }
  const issues = []
  const missing = {$ref: '#/components/parameters/Missing'}
  assert.deepEqual(effectiveParameters([missing], [], document, issue => issues.push(issue)), [missing])
  assert.match(issues[0].message, /not found/)
})

test('Reference Lab fixture verifies normal and webhook inheritance with one override policy', () => {
  const before = JSON.stringify(requestFixture)
  const operations = getInlineOperations(requestFixture.paths, requestFixture)
  const get = operations.find(entry => entry.method === 'get' && entry.path === '/projects/{projectId}').operation
  const patch = operations.find(entry => entry.method === 'patch').operation
  assert.equal(get.parameters.find(p => p.name === 'projectId').required, true)
  assert.equal(get.parameters.find(p => p.name === 'X-Trace-Id').required, true)
  assert.equal(get.parameters.find(p => p.name === 'view').example, 'summary')
  assert.deepEqual(patch.parameters.filter(p => p.name === 'view').map(p => [p.in, p.example]), [['query', 'full'], ['header', 'editor']])
  const webhook = getWebhookOperations(requestFixture)[0].operation
  assert.equal(webhook.parameters.find(p => p.name === 'X-Trace-Id').required, true)
  assert.deepEqual(webhook.parameters.filter(p => p.name === 'delivery').map(p => p.example), ['retry'])
  const item = requestFixture.webhooks['project.updated']
  assert.deepEqual(webhook.parameters, getInlineOperations({'/delivery': item}, requestFixture)[0].operation.parameters)
  assert.equal(JSON.stringify(requestFixture), before)
})

test('request bodies prefer their description and keep examples in the request example panel', async () => {
  const components = {schemas: {CancelEventRequest: {
    type: 'object', description: 'Request body for canceling an event.',
    example: {cancel_reason: 'Schedule conflict'},
    properties: {cancel_reason: {type: 'string', description: 'Why the event was canceled', example: 'Schedule conflict'}},
  }}}
  const document = {openapi: '3.0.3', components}
  const content = {'application/json': {schema: {$ref: '#/components/schemas/CancelEventRequest'}}}
  for (const description of ['Cancellation details', undefined, '']) {
    const requestBody = {content, ...(description === undefined ? {} : {description})}
    const html = await renderWithDocument(RequestBody, {components, requestBody}, document)
    if (description) assert.equal((html.match(/Cancellation details/g) ?? []).length, 1)
    if (description === undefined) assert.match(html, /Request body for canceling an event\./)
    else assert.doesNotMatch(html, /Request body for canceling an event\./)
    assert.match(html, /Why the event was canceled/)
    assert.doesNotMatch(html, />Examples?<\/div>|Schedule conflict/)
    const exampleHtml = await renderWithDocument(Examples, {
      components, base: 'https://example.com', path: '/events/cancel', method: 'post', operation: {requestBody},
    }, document)
    assert.match(exampleHtml, /Schedule conflict/)
  }
})

test('response bodies retain their schema description and keep examples in the response example panel', async () => {
  const {default: SecondaryResponse} = await server.ssrLoadModule('/src/components/OpenApi/SecondaryResponse.tsx')
  const components = {schemas: {SingleEventResponse: {allOf: [{$ref: '#/components/schemas/Event'}]}, Event: {
    type: 'object', description: 'The event schema description', example: {id: 'event-example'},
    properties: {id: {type: 'string', description: 'The event ID', example: 'event-example'}},
  }}}
  const document = {openapi: '3.0.3', components}
  const content = {'application/json': {schema: {$ref: '#/components/schemas/SingleEventResponse'}}}
  for (const description of ['The response description', undefined, '']) {
    const response = {content, ...(description === undefined ? {} : {description})}
    for (const [component, props] of [
      [ResponseContent, {unreferencedResponse: response, statusCode: '200'}],
      [SecondaryResponse, {response, statusCode: 200}],
    ]) {
      const html = await renderWithDocument(component, {components, ...props}, document)
      if (description) assert.equal((html.match(/The response description/g) ?? []).length, 1)
      assert.equal((html.match(/The event schema description/g) ?? []).length, 1)
      assert.match(html, /The event ID/)
      assert.doesNotMatch(html, />Examples?<\/div>|event-example/)
    }
    const exampleHtml = await renderWithDocument(Examples, {
      components, base: 'https://example.com', path: '/events', method: 'get', operation: {responses: {200: response}},
    }, document)
    assert.match(exampleHtml, /event-example/)
  }
})


test('array response bodies retain collection and item descriptions', async () => {
  const components = {schemas: {
    TimeZoneListResponse: {type: 'array', description: 'List of time zones with localized information', items: {$ref: '#/components/schemas/TimeZone'}},
    TimeZone: {type: 'object', description: 'Information about a single time zone', properties: {id: {type: 'string'}}},
  }}
  const response = {description: 'Success', content: {'application/json': {schema: {$ref: '#/components/schemas/TimeZoneListResponse'}}}}
  const html = (await renderWithDocument(ResponseContent, {components, unreferencedResponse: response}, {components})).replace(/<!--.*?-->/gs, '')
  assert.match(html, /List of time zones with localized information/)
  assert.match(textContent(html), /TimeZone\s*\[\]/)
  assert.match(html, /Information about a single time zone/)
})

test('response body descriptions prefer the allOf wrapper over its referenced child', async () => {
  const components = {schemas: {
    SingleEventResponse: {description: 'Single event response', allOf: [{$ref: '#/components/schemas/Event'}]},
    Event: {type: 'object', description: 'A scheduled event/booking', properties: {id: {type: 'string'}}},
  }}
  const document = {openapi: '3.0.3', components}
  const response = {description: 'Success', content: {'application/json': {schema: {$ref: '#/components/schemas/SingleEventResponse'}}}}
  const html = await renderWithDocument(ResponseContent, {components, unreferencedResponse: response, statusCode: '200'}, document)
  assert.match(html, /Success/)
  assert.equal((html.match(/Single event response/g) ?? []).length, 1)
  assert.doesNotMatch(html, /A scheduled event\/booking/)
})

test('required referenced and optional inline request bodies retain descriptions even without content', async () => {
  const {default: RequestBody} = await server.ssrLoadModule('/src/components/OpenApi/RequestBody.tsx')
  const components = requestFixture.components
  const required = await renderWithDocument(RequestBody, {components, requestBody: {$ref: '#/components/requestBodies/ProjectUpdateAlias'}}, requestFixture)
  assert.match(required, /Required referenced request body/)
  assert.match(required, />required<\/span>/)
  assert.match(required, /aria-label="Request body content type"/)
  assert.match(required, /aria-label="Request body content type"/)
  assert.match(required, /title="application\/json"/)
  const optional = await renderWithDocument(RequestBody, {components, requestBody: requestFixture.paths['/projects/preview'].post.requestBody}, requestFixture)
  assert.match(optional, /Omit the body to preview a default project/)
  assert.doesNotMatch(optional, />required<\/span>/)
  const noContent = await renderWithDocument(RequestBody, {components, requestBody: {description: 'Visible without content', required: false}}, requestFixture)
  assert.match(noContent, /Visible without content/)
  assert.doesNotMatch(noContent, />required<\/span>/)
})

test('parameter display preserves content alternatives and named examples', async () => {
  const components = requestFixture.components
  const parameters = requestFixture.paths['/projects/search'].get.parameters
  for (const name of ['tags', 'fields', 'label', 'filter', 'region']) {
    const parameter = parameters.find(p => p.name === name)
    const html = await renderWithDocument(ParameterDetails, {components, parameter}, requestFixture)
    if (name === 'tags') {
      assert.match(html, /design/)
      assert.match(html, /review/)
      assert.doesNotMatch(html, /schema-fallback/)
    }
    if (name === 'filter') {
      assert.match(html, /application\/json/)
      assert.match(html, /aria-expanded="false"[^>]*>\+ Show properties<\/button>/)
      assert.match(html, /Active projects/)
      assert.match(html, /JSON-encode this object/)
      assert.match(html, /&quot;status&quot;:&quot;active&quot;/)
    }
    if (name === 'region') {
      assert.match(html, /European region/)
      assert.match(html, /US region/)
      assert.match(html, />eu<\/div>/)
      assert.match(html, />us<\/div>/)
    }
  }
})

test('parameter examples preserve falsy values and precedence over referenced schema examples', async () => {
  for (const example of [false, 0, '', null]) {
    const document = {openapi: '3.0.3', components: {schemas: {Value: {type: 'string', example: 'schema-fallback'}}}}
    const html = await renderWithDocument(ParameterDetails, {components: document.components, parameter: {
      name: 'value', in: 'query', schema: {$ref: '#/components/schemas/Value'}, example,
    }}, document)
    assert.doesNotMatch(html, /schema-fallback/)
    assert.ok(textContent(html).includes(example === '' ? "''" : String(example)))
  }
  const html = await renderWithDocument(ParameterDetails, {components: {}, parameter: {
    name: 'flag', in: 'query', schema: {type: 'boolean'}, examples: {missing: {$ref: '#/missing'}},
  }}, {})
  assert.match(html, /Reference target was not found/)
})

async function renderWithDocument(component, props, document) {
  return renderToString(h(DocumentContext.Provider, {value: document}, h(OperationSelectionsProvider, null, h(component, props))))
}

test('nullable types agree across OpenAPI 3.0, 3.1 unions, arrays and null examples', async () => {
  const text = schema => getSchemaTypeParts(schema).map(part => part.text).join('')
  assert.equal(text({type: 'string', nullable: true}), 'string | null')
  assert.equal(text({type: ['string', 'null']}), 'string | null')
  assert.equal(text({anyOf: [{type: 'string'}, {type: 'null'}]}), 'string | null')
  assert.equal(text({type: 'array', items: {type: ['string', 'null']}}), '(string | null)[]')
  assert.equal(text({type: ['array', 'null'], items: {type: 'string'}}), 'string[] | null')
  assert.equal(createSchemaExample({oneOf: [{type: 'null'}, {type: 'string'}]}), 'string')
  assert.equal(createSchemaExample({type: 'string', nullable: true, example: null}), null)
  for (const [openapi, schema] of [['3.0.3', {type: 'string', nullable: true}], ['3.1.0', {type: ['string', 'null']}]]) {
    const html = await renderWithDocument(Schema, {schema, components: {}}, {openapi})
    assert.match(html, /string/)
    assert.match(html, /null/)
  }
})

test('typed maps resolve references, generate values and display extra-property restrictions', async () => {
  const document = {openapi: '3.1.0', components: {schemas: {Count: {type: 'integer', minimum: 0}}}}
  const schema = {type: 'object', additionalProperties: {$ref: '#/components/schemas/Count'}}
  assert.deepEqual(createSchemaExample(resolveExampleSchema(schema, document.components, document)), {additionalProp1: 0})
  const html = await renderWithDocument(Schema, {schema, components: document.components}, document)
  assert.match(html, /\[key: string\]/)
  assert.match(html, /Count/)
  assert.match(html, /&gt;=<\/span> 0/)
  for (const additionalProperties of [false, true]) {
    const html = await renderWithDocument(Schema, {schema: {type: 'object', additionalProperties}, components: {}}, {})
    assert.doesNotMatch(html, /not allowed/)
    assert.deepEqual(createSchemaExample({type: 'object', additionalProperties}), {})
  }
})

test('schema direction filters referenced and nested fields in documentation and authored/generated examples', async () => {
  const document = {openapi: '3.1.0', components: {schemas: {Id: {type: 'string', readOnly: true, example: 'id'}}}}
  const schema = {type: 'object', required: ['id', 'secret', 'name'], properties: {
    id: {$ref: '#/components/schemas/Id'}, secret: {type: 'string', writeOnly: true, example: 'secret'},
    name: {type: 'string', deprecated: true, example: 'old'},
    nested: {type: 'object', properties: {hidden: {type: 'string', writeOnly: true}, visible: {type: 'boolean'}}},
  }}
  const before = JSON.stringify(schema)
  const resolved = resolveExampleSchema(schema, document.components, document)
  assert.deepEqual(createSchemaExample(resolved, 'request'), {secret: 'secret', name: 'old', nested: {hidden: 'string', visible: true}})
  assert.deepEqual(createSchemaExample(resolved, 'response'), {id: 'id', name: 'old', nested: {visible: true}})
  const authored = {...resolved, example: {id: 'real-id', secret: 'real-secret', nested: {hidden: 'hidden', visible: false}}}
  assert.deepEqual(createSchemaExample(authored, 'response'), {id: 'real-id', nested: {visible: false}})
  for (const direction of ['request', 'response', 'neutral']) {
    const html = await renderWithDocument(Schema, {schema, components: document.components, direction}, document)
    assert.match(html, /deprecated/)
    if (direction === 'request') { assert.doesNotMatch(html, />id<\/div>/); assert.match(html, /write-only/) }
    if (direction === 'response') { assert.doesNotMatch(html, />secret<\/div>/); assert.match(html, /read-only/) }
    if (direction === 'neutral') { assert.match(html, /read-only/); assert.match(html, /write-only/) }
  }
  const media = {schema}
  const request = createRequestExample('https://example.com', '/objects', 'post', 'application/json', media, document.components, document)
  assert.doesNotMatch(request.body, /"id"/)
  assert.match(request.body, /"secret"/)
  const html = await renderWithDocument(Examples, {base: 'https://example.com', path: '/objects', method: 'post', components: document.components,
    operation: {requestBody: {content: {'application/json': media}}, responses: {'200': {description: 'OK', content: {'application/json': media}}}},
  }, document)
  const responsePanel = html.slice(html.indexOf('aria-label="Response example"'))
  assert.doesNotMatch(responsePanel, /&quot;secret&quot;|&quot;hidden&quot;/)
  assert.match(responsePanel, /&quot;id&quot;/)
  assert.equal(JSON.stringify(schema), before)
})

test('direction follows allOf flags, maps, arrays and structured media examples across transports', async () => {
  const {getMediaExample, formatMediaExample} = await server.ssrLoadModule('/src/core/openapi/mediaExamples.ts')
  const schema = {type: 'object', properties: {
    id: {allOf: [{type: 'string', readOnly: true}]},
    secret: {type: 'string', writeOnly: true},
    entries: {type: 'array', items: {type: 'object', properties: {secret: {type: 'string', writeOnly: true}, name: {type: 'string'}}}},
    dictionary: {type: 'object', additionalProperties: {type: 'object', properties: {secret: {type: 'string', writeOnly: true}, name: {type: 'string'}}}},
  }}
  const value = {id: 'id', secret: 'password', entries: [{secret: 'nested', name: 'entry'}], dictionary: {a: {secret: 'mapped', name: 'map'}}}
  const media = {schema, examples: {named: {summary: 'Authored', value}}}
  const before = JSON.stringify(media)
  assert.deepEqual(getMediaExample(media, {}, true, {}, undefined, 'response'), {id: 'id', entries: [{name: 'entry'}], dictionary: {a: {name: 'map'}}})
  const form = createRequestExample('https://example.com', '/objects', 'post', 'application/x-www-form-urlencoded', media, {})
  assert.equal(form.formFields.some(([name]) => name === 'id'), false)
  assert.equal(form.formFields.some(([name]) => name === 'secret'), true)
  const xml = formatMediaExample(media, 'application/xml', {}, true, {}, undefined, 'response')
  assert.doesNotMatch(xml, /<secret>/)
  assert.match(xml, /<id>id<\/id>/)
  const parameterHtml = await renderWithDocument(ParameterDetails, {components: {}, parameter: {name: 'filter', in: 'query', schema, examples: media.examples}}, {})
  assert.doesNotMatch(parameterHtml, /&quot;id&quot;/)
  assert.match(parameterHtml, /Authored/)
  assert.equal(JSON.stringify(media), before)
})

test('reference fixture resolves aliases, escaped names and non-component locations in every consumer', async () => {
  const document = referenceFixture
  const components = document.components
  const operations = getInlineOperations(document.paths, document)
  assert.equal(operations.find(item => item.path === '/alias').operation.summary, 'Source endpoint')
  assert.equal(resolveSecurityScheme('Alias', components, document).scheme, 'basic')
  const operation = {...document.paths['/source'].post,
    parameters: [{$ref: '#/components/parameters/Trace'}],
    requestBody: {$ref: '#/components/requestBodies/Alias'},
  }
  const {default: Operation} = await server.ssrLoadModule('/src/components/OpenApi/Operation.tsx')
  const html = await renderWithDocument(Operation, {base: 'https://api.example.com', path: '/alias', method: 'post', operation, components}, document)
  for (const pattern of [/Trace identifier/, /Remaining count/, /Local response description/, /&quot;id&quot;: 7/, /&quot;id&quot;: 8/]) assert.match(withoutHighlighting(html), pattern)
  assert.match(await renderAuthentication(operation, document), /Basic authentication/)
  assert.doesNotMatch(html, /Reference warning/)
  const schema = resolveExampleSchema(components.schemas.FromPath, components, document)
  assert.deepEqual(createSchemaExample(schema), {id: 7})
})

test('schema sibling semantics match documentation and examples in 3.0 and 3.1', async () => {
  for (const openapi of ['3.0.3', '3.1.0']) {
    const document = {...referenceFixture, openapi}
    const schema = document.components.schemas.Extended
    const value = createSchemaExample(resolveExampleSchema(schema, document.components, document))
    assert.deepEqual(value, openapi === '3.1.0' ? {id: 7, name: 'pet'} : {id: 7})
    const html = await renderWithDocument(Schema, {schema, components: document.components}, document)
    assert.match(html, /id/)
    if (openapi === '3.1.0') {
      assert.doesNotMatch(html, /Must match all schemas/)
      assert.doesNotMatch(html, /aria-label="all of"/)
      assert.match(html, /name/)
    } else assert.doesNotMatch(html, /name|Must match all schemas/)
  }
})

test('unresolved, circular and external schema sections render explicit local diagnostics', async () => {
  for (const [name, message] of [['Missing', /not found/], ['LoopA', /Circular reference/], ['External', /External references are not supported/]]) {
    const html = await renderWithDocument(Schema, {schema: referenceFixture.components.schemas[name], components: referenceFixture.components}, referenceFixture)
    assert.match(html, /aria-label="Reference warning"/)
    assert.match(html, message)
  }
  const html = await renderPages(referenceFixture.components, '#overview', {document: referenceFixture, paths: referenceFixture.paths})
  assert.match(html, /Source endpoint/)
  assert.match(html, /Reference target was not found/)
  assert.match(html, /External references are not supported/)
  assert.match(html, /Circular reference/)
  assert.doesNotMatch(html, /Unable to display this API/)
})

test('recursive schema rendering terminates in properties, items and composition', async () => {
  const document = structuredClone(referenceFixture)
  document.components.schemas.Array = {type: 'array', items: {$ref: '#/components/schemas/Array'}}
  document.components.schemas.Composition = {allOf: [{$ref: '#/components/schemas/Composition'}]}
  for (const name of ['Node', 'Array', 'Composition']) {
    const html = await renderWithDocument(Schema, {schema: document.components.schemas[name], components: document.components}, document)
    if (name === 'Composition') assert.match(html, /Recursive schema/)
    else assert.doesNotMatch(html, /Recursive schema/)
    assert.doesNotMatch(html, /Circular reference alias/)
  }
})

test('recursive properties preserve names, descriptions and schema links without expanding children', async () => {
  for (const openapi of ['3.0.3', '3.1.0']) {
    for (const description of [undefined, 'Property description']) {
      const document = {openapi, components: {schemas: {Node: {
        type: 'object', description: 'Schema description', required: ['next'],
        properties: {next: {$ref: '#/components/schemas/Node', ...(description ? {description} : {})}},
        additionalProperties: {$ref: '#/components/schemas/Node'},
      }}}}
      const html = renderToString(h(DocumentContext.Provider, {value: document}, h(ShowSchemasContext.Provider, {value: true}, h(Schema, {schema: document.components.schemas.Node, components: document.components}))))
      assert.equal((html.match(/>next<\/div>/g) ?? []).length, 1)
      assert.equal((html.match(/>required<\/div>/g) ?? []).length, 1)
      assert.equal((html.match(/Hide properties/g) ?? []).length, 1)
      assert.doesNotMatch(html, /Show properties|Recursive schema/)
      assert.match(html, /href="#schemas\/Node"/)
      assert.match(html, /\[key: string\]/)
      assert.equal((html.match(/Schema description/g) ?? []).length, openapi === '3.1.0' && description ? 2 : 3)
      if (openapi === '3.1.0' && description) assert.match(html, /Property description/)
      else assert.doesNotMatch(html, /Property description/)
    }
  }
})

test('bad body, response, header and named-example references stay local and disable incomplete example copies', async () => {
  const {default: RequestBody} = await server.ssrLoadModule('/src/components/OpenApi/RequestBody.tsx')
  const {default: Response} = await server.ssrLoadModule('/src/components/OpenApi/Response.tsx')
  const components = referenceFixture.components
  const body = await renderWithDocument(RequestBody, {requestBody: {$ref: 'body.yaml#/Body'}, components}, referenceFixture)
  assert.match(body, /External references are not supported/)
  const response = await renderWithDocument(Response, {statusCode: '200', response: {$ref: '#/missing'}, components}, referenceFixture)
  assert.match(response, /Reference target was not found/)
  const headers = await renderWithDocument(ResponseContent, {unreferencedResponse: {description: 'Still visible', headers: {Broken: {$ref: '#/components/headers/Broken'}}}, components}, referenceFixture)
  assert.match(headers, /Still visible/)
  assert.match(headers, /headers.yaml/)
  const html = await renderWithDocument(Examples, {base: 'https://api.example.com', path: '/pets', method: 'post', components,
    operation: {requestBody: {content: {'application/json': {examples: {bad: {$ref: '#/missing'}}}}}, responses: {'200': {$ref: 'responses.yaml#/Success'}}},
  }, referenceFixture)
  assert.match(html, /Reference target was not found/)
  assert.match(html, /External references are not supported/)
  assert.match(html, /disabled[^>]*aria-label="Copy request example"/)
  assert.match(html, /disabled[^>]*aria-label="Copy response example"/)
})

test('example payloads containing literal $ref keys remain data', () => {
  const document = {openapi: '3.1.0', components: {examples: {Payload: {value: {$ref: 'literal-value.yaml', id: 1}}}}}
  const resolved = resolveReference(document, {$ref: '#/components/examples/Payload'})
  assert.deepEqual(resolved.value.value, {$ref: 'literal-value.yaml', id: 1})
  assert.deepEqual(resolved.issues, [])
})


test('API branding resolves spec-relative logos and contact links with accessible text', async () => {
  const html = await renderToString(h(ApiBrand, {
    documentUrl: 'https://example.com/spec/openapi.yaml',
    info: {title: 'Example API', contact: {url: '../support'}, 'x-logo': {
      url: './logo.svg', altText: 'Example logo', backgroundColor: '#FFFFFF',
    }},
  }))
  assert.match(html, /src="https:\/\/example.com\/spec\/logo.svg"/)
  assert.match(html, /href="https:\/\/example.com\/support"/)
  assert.match(html, /alt="Example logo"/)
  assert.match(html, /background-color:#FFFFFF/)
})

test('API branding honors explicit links and rejects unsafe URLs and invalid colors', async () => {
  const render = info => renderToString(h(ApiBrand, {info}))
  const html = await render({contact: {url: 'https://example.com/support'}, 'x-logo': {
    url: 'https://example.com/logo.png', href: 'https://example.com/home', backgroundColor: 'url(https://example.com)',
  }})
  assert.match(html, /href="https:\/\/example.com\/home"/)
  assert.match(html, /alt="logo"/)
  assert.doesNotMatch(html, /background-color/)
  const unsafeLink = await render({'x-logo': {url: 'https://example.com/logo.png', href: 'javascript:alert(1)'}})
  assert.doesNotMatch(unsafeLink, /<a\b|javascript:/)
  for (const logo of [undefined, {url: 'javascript:alert(1)'}, {url: 'data:image/svg+xml,unsafe'}, {url: ''}]) {
    const fallback = await render({title: 'Example API', 'x-logo': logo})
    assert.match(fallback, /Example API/)
    assert.doesNotMatch(fallback, /<img/)
  }
})

test('configured branding replaces spec branding and supports image plus text', async () => {
  const html = await renderToString(h(ApiBrand, {
    info: {title: 'Selected API', contact: {url: 'https://spec.example/contact'}, 'x-logo': {
      url: 'https://spec.example/logo.svg', backgroundColor: '#FFFFFF',
    }},
    logo: {title: 'Acme', image: {src: 'https://acme.example/logo.svg', alt: '', height: 32}},
  }))
  assert.match(html, /src="https:\/\/acme.example\/logo.svg"/)
  assert.match(html, /alt(?:="")?\s/)
  assert.match(html, /height:32px/)
  assert.match(html, />Acme<\/span>/)
  assert.match(html, /href="#overview"/)
  assert.doesNotMatch(html, /spec.example/)
})

test('configured branding supports text, hiding, safe links and named image-only links', async () => {
  const render = logo => renderToString(h(ApiBrand, {info: {title: 'Selected API'}, logo}))
  assert.match(await render({title: 'Acme', href: false}), />Acme<\/span>/)
  assert.doesNotMatch(await render({title: 'Acme', href: false}), /<a\b/)
  assert.doesNotMatch(await render(false), /Selected API|<img|<a\b/)
  const image = {src: 'https://acme.example/logo.svg', alt: ''}
  assert.match(await render({image}), /alt="Selected API"/)
  assert.match(await render({image: {...image, alt: 'Acme'}}), /alt="Acme"/)
  const external = await render({title: 'Acme', href: 'https://acme.example', target: '_blank'})
  assert.match(external, /target="_blank"/)
  assert.match(external, /rel="noopener noreferrer"/)
  assert.doesNotMatch(await render({title: 'Acme', href: 'javascript:alert(1)'}), /<a\b|javascript:/)
  const invalid = await render({title: 'Acme', image: {src: 'javascript:alert(1)', alt: 'Acme'}})
  assert.match(invalid, />Acme<\/span>/)
  assert.doesNotMatch(invalid, /<img/)
})

test('authorization placeholders respect inheritance, references and public or combined requirements', () => {
  const document = {security: [{Alias: []}], components: {securitySchemes: {
    Alias: {$ref: '#/components/securitySchemes/Token'},
    Token: {type: 'http', scheme: 'bearer'},
    Basic: {type: 'http', scheme: 'basic'},
    Key: {type: 'apiKey', in: 'header', name: 'X-API-Key'},
  }}}
  assert.equal(authorizationHeaderExample({}, document), 'Bearer <token>')
  assert.equal(authorizationHeaderExample({security: [{Basic: []}]}, document), 'Basic <base64-credentials>')
  for (const security of [[], [{}], [{Key: []}], [{Missing: []}], [{Token: [], Key: []}]]) {
    assert.equal(authorizationHeaderExample({security}, document), undefined)
  }
})

async function renderAuthentication(operation, document) {
  const mounted = await mountReact(h(DocumentContext.Provider, {value: document}, h(OperationSelectionsProvider, null, h(OperationDatums, {operation}))))
  try {
    const trigger = mounted.container.querySelector('button[aria-haspopup="dialog"]')
    if (!trigger) return mounted.container.innerHTML
    await act(async () => trigger.dispatchEvent(new window.MouseEvent('click', {bubbles: true, cancelable: true})))
    await act(async () => new Promise(resolve => window.requestAnimationFrame(() => resolve())))
    return globalThis.document.body.innerHTML
  } finally { await mounted.unmount() }
}

async function renderAuthenticationDetails(operation, document) {
  const groups = operationSecurity(operation, document).filter(group => group.length)
  return renderToString(h('div', null, ...groups.flatMap(group => group.map(entry => h(SecuritySchemeDetails, {
    key: entry.name,
    name: entry.name,
    scopes: entry.scopes,
    scheme: resolveSecurityScheme(entry.name, document.components ?? {}, document),
  })))))
}

test('Basic authentication shows inherited scheme descriptions', async () => {
  const document = {security: [{ConvertererApiKey: []}], components: {securitySchemes: {
    ConvertererApiKey: {type: 'http', scheme: 'basic', description: 'Use your Converterer API key as the username.\nLeave the password empty.'},
  }}}
  const html = await renderAuthentication({}, document)
  assert.match(html, /Basic authentication/)
  assert.match(html, /Use your Converterer API key as the username/)
  assert.match(html, /Leave the password empty/)
  assert.match(html, /Base64-encoded/)
  assert.doesNotMatch(html, /Bearer/)
  const overview = await renderPages(document.components, '#overview', {document})
  assert.match(overview, /Basic authentication/)
  assert.match(overview, /Leave the password empty/)
  assert.match(overview, /Leave the password empty/)
})

test('operation authentication overrides inheritance and distinguishes public and optional access', async () => {
  const document = {security: [{Basic: []}], components: {securitySchemes: {Basic: {type: 'http', scheme: 'basic'}}}}
  assert.doesNotMatch(await renderAuthentication({security: []}, document), /Basic authentication/)
  const optional = await renderAuthentication({security: [{}, {Basic: []}]}, document)
  assert.match(optional, /Authentication is optional/)
  assert.match(optional, /<span>Auth optional<\/span>/)
  assert.match(optional, /Basic authentication/)
})

test('authentication alternatives, combined requirements, scopes and API key locations are explicit', async () => {
  const document = {components: {securitySchemes: {
    OAuth: {type: 'oauth2', flows: {}},
    Key: {type: 'apiKey', name: 'X-API-Key', in: 'header'},
    Token: {type: 'http', scheme: 'Bearer', bearerFormat: 'JWT'},
  }}}
  const html = await renderAuthentication({security: [{OAuth: ['files:read'], Key: []}, {Token: []}]}, document)
  assert.match(html, /<span>Auth required<\/span>/)
  assert.match(html, /Use one of the following/)
  assert.match(html, /All of these methods are required together/)
  assert.match(html, /Or — Option 2/)
  assert.match(html, /files:read/)
  assert.match(html, /X-API-Key<\/code> header/)
  assert.match(html, /<dt[^>]*>Format<\/dt>/)
  assert.match(html, /<dd[^>]*>JWT<\/dd>/)
  assert.match(html, /OAuth 2.0/)
  assert.ok(parseHtml(html).querySelector('[role="dialog"][aria-label="Authentication"]'))
  for (const location of ['query', 'cookie']) {
    const result = await renderAuthentication({security: [{Key: []}]}, {components: {securitySchemes: {
      Key: {type: 'apiKey', name: 'key', in: location},
    }}})
    assert.match(result, new RegExp(location === 'query' ? 'query parameter' : 'cookie'))
  }
})

test('OAuth details render flow URLs, bearer formats and scopes', async () => {
  const document = {components: {securitySchemes: {
    OAuth: {type: 'oauth2', flows: {
      authorizationCode: {authorizationUrl: '/oauth/authorize', tokenUrl: '/oauth/token', refreshUrl: ' ', scopes: {}},
    }},
    Token: {type: 'http', scheme: 'bearer', bearerFormat: 'pt_secret_XXXXXXXXX'},
  }}}
  const html = await renderAuthentication({security: [{OAuth: []}, {Token: []}]}, document)
  for (const [label, value] of [['Flow', 'Authorization code'], ['Authorization URL', '/oauth/authorize'], ['Token URL', '/oauth/token'], ['Format', 'pt_secret_XXXXXXXXX']]) {
    assert.ok(textContent(html).includes(label))
    assert.ok(textContent(html).includes(value))
  }
  document.components.securitySchemes.OAuth.flows.clientCredentials = {
    tokenUrl: 'https://example.com/oauth/token', refreshUrl: 'https://example.com/oauth/refresh',
    scopes: {'files:read': 'Read files', 'files:write': ''},
  }
  const populated = await renderAuthentication({security: [{OAuth: ['files:read']}]}, document)
  for (const value of ['Client credentials', 'Refresh URL', 'https://example.com/oauth/refresh', 'Scopes', 'files:read — Read files', 'files:write', 'Required scopes']) assert.ok(populated.includes(value))
})

test('security scheme references decode JSON pointers, follow chains and report unresolved schemes', async () => {
  const components = {securitySchemes: {
    Alias: {$ref: '#/components/securitySchemes/A~1B~0C'},
    'A/B~C': {$ref: '#/components/securitySchemes/Basic'},
    Basic: {type: 'http', scheme: 'basic'},
    Cycle: {$ref: '#/components/securitySchemes/Cycle'},
    External: {$ref: 'https://example.com/schemes.json#/Basic'},
  }}
  assert.equal(resolveSecurityScheme('Alias', components), components.securitySchemes.Basic)
  assert.equal(resolveSecurityScheme('Cycle', components), undefined)
  assert.equal(resolveSecurityScheme('External', components), undefined)
  const document = {components, security: [{Alias: []}]}
  assert.equal(operationSecurity({}, document)[0][0].scheme, components.securitySchemes.Basic)
  const html = await renderAuthentication({security: [{Missing: []}]}, document)
  assert.match(html, /could not be resolved/)
  assert.doesNotMatch(html, /Bearer/)
})

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
  assert.match(textContent(withoutHighlighting(html)), /curl -X POST 'https:\/\/download.converterer\.com\/'/)
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
  assert.match(textContent(withoutHighlighting(html)), /curl -X GET 'https:\/\/spec.example.com\/v2\/files'/)
  assert.doesNotMatch(html, /root\.example\.com|path\.example\.com|curl -X POST/)
})

test('request curl sends URL-encoded fields for form content', async () => {
  const html = renderToString(h(OperationSelectionsProvider, null, h(Examples, {
    base: '', components: {}, path: '/pet', method: 'post', operation: {
      requestBody: {content: {'application/x-www-form-urlencoded': {example: {
        name: "dog's & cat", category: {id: 1}, photoUrls: ['one', 'two'],
      }}}}, responses: {},
    },
  })))
  assert.match(html, /Content-Type: application\/x-www-form-urlencoded/)
  const code = textContent(withoutHighlighting(html))
  assert.match(code, /--data-urlencode 'name=dog'\\''s & cat'/)
  assert.match(code, /--data-urlencode 'category=\{"id":1\}'/)
  assert.match(code, /--data-urlencode 'photoUrls=one'/)
  assert.match(code, /--data-urlencode 'photoUrls=two'/)
  assert.doesNotMatch(html, / -d /)
})

async function renderReference(target) {
  return renderToString(h(ShowSchemasContext.Provider, {value: true}, h(Schema, {
    schema: {$ref: '#/components/schemas/MetadataInstanceValue'},
    components: {schemas: {MetadataInstanceValue: target}},
    propertyTitle: 'value',
    level: 1,
  })))
}

test('renders a referenced oneOf schema without a top-level type', async () => {
  const html = await renderReference({
    description: 'Metadata value.',
    example: 'reviewed',
    oneOf: [{type: 'string'}, {type: 'integer'}, {type: 'number'}, {type: 'array', items: {type: 'string'}}],
  })
  assert.match(html, /Metadata value\./)
  assert.match(html, /reviewed/)
  assert.match(html, /aria-label="one of"/)
  assert.equal((html.match(/role="tab"/g) ?? []).length, 4)
  assert.doesNotMatch(html, /Show options|Hide options/)
})

test('composition tabs show only the selected member and keep referenced labels as buttons', async () => {
  const options = [
    {type: 'string', enum: ['a4', 'letter']},
    {type: 'object', required: ['width', 'height'], properties: {
      width: {type: ['string', 'number']}, height: {type: ['string', 'number']},
    }},
  ]
  for (const [keyword, label] of [['anyOf', 'any of'], ['oneOf', 'one of']]) {
    const html = await renderReference({[keyword]: options, default: 'a4'})
    assert.ok(html.includes(`aria-label="${label}"`))
    assert.ok(parseHtml(html).querySelector('[role="tab"][aria-selected="true"]'))
    assert.match(html, /role="tabpanel"/)
    assert.doesNotMatch(html, /width|height|Hide options|Option 1/)
  }
  const html = await renderReference({oneOf: [{$ref: '#/components/schemas/Label'}, {type: 'number'}]})
  const labelTab = [...parseHtml(html).querySelectorAll('[role="tab"]')].find(tab => tab.textContent.trim() === 'Label')
  assert.ok(labelTab)
  assert.equal(labelTab.tagName, 'BUTTON')
})

test('renders const constraints, including falsy and structured values', async () => {
  for (const value of ['Pong!', null, false, 0, '', {message: 'Pong!'}]) {
    const html = await renderReference({const: value})
    const text = textContent(html)
    assert.match(text, /Const/)
    const formatted = value === '' ? "''" : typeof value === 'object' ? JSON.stringify(value) : String(value)
    assert.ok(text.includes(formatted))
  }
})

test('accepts other referenced schemas without a top-level type', async () => {
  for (const target of [{}, {anyOf: [{type: 'string'}, {type: 'number'}]}, {description: 'Free-form value.', example: {key: 'value'}}]) {
    const html = await renderReference(target)
    assert.match(html, target.anyOf ? /aria-label="any of"/ : /MetadataInstanceValue/)
  }
})

async function renderPages(components, hash = '', options = {}) {
  const previous = new Map(['window', 'document'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]))
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {url: `http://localhost/${hash}`})
  Object.defineProperty(globalThis, 'window', {configurable: true, writable: true, value: dom.window})
  Object.defineProperty(globalThis, 'document', {configurable: true, writable: true, value: dom.window.document})
  try {
    const {document: suppliedDocument, paths, ...pageOptions} = options
    const document = {info: {title: 'API'}, ...suppliedDocument, components, paths: paths ?? suppliedDocument?.paths ?? {}}
    return renderToString(h(Pages, {document, base: 'https://api.example.com', ...pageOptions}))
  } finally {
    dom.window.close()
    for (const [name, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor)
      else delete globalThis[name]
    }
  }
}

test('only shows schema navigation when component schemas exist', async () => {
  assert.doesNotMatch(await renderPages({}), /aria-label="Schemas"/)
  assert.doesNotMatch(await renderPages({schemas: {}}), /aria-label="Schemas"/)
  assert.match(await renderPages({schemas: {Person: {type: 'object'}}}), /aria-label="Schemas"/)
})

test('webhooks sit between reference and schemas and render a separate incoming request page', async () => {
  const components = {schemas: {Event: {type: 'object', properties: {event_id: {type: 'string'}}}}}
  const document = {webhooks: {'planet/created': {post: {
    operationId: 'shared-id', summary: 'Planet created', description: 'Receive a newly discovered planet.',
    requestBody: {content: {'application/json': {schema: {$ref: '#/components/schemas/Event'}}}},
    responses: {'204': {description: 'Event accepted'}},
  }}}}
  const html = await renderPages(components, '#webhooks/planet%2Fcreated/post', {document,
    paths: {'/planets': {get: {operationId: 'shared-id', summary: 'List planets', responses: {}}}},
  })
  assert.ok(html.indexOf('aria-label="API reference"') < html.indexOf('aria-label="Webhooks"'))
  assert.ok(html.indexOf('aria-label="Webhooks"') < html.indexOf('aria-label="Schemas"'))
  assert.match(html, /aria-current="page"[^>]*>.*?Planet created/s)
  assert.match(html, /Webhook · planet\/created/)
  assert.match(withoutHighlighting(html), /https:\/\/your-app\.example\/webhooks\/planet%2Fcreated/)
  assert.match(html, /Receive a newly discovered planet/)
  assert.match(html, /event_id/)
  assert.match(html, /Event accepted/)
  assert.doesNotMatch(html, /<h1[^>]*>List planets/)
  assert.doesNotMatch(await renderPages({}), /aria-label="Webhooks"/)
})

test('webhooks resolve local path items and inherit shared parameters with operation overrides', () => {
  const shared = {name: 'signature', in: 'header', description: 'Shared'}
  const override = {...shared, description: 'Operation'}
  const document = {components: {pathItems: {'Event/created': {
    summary: 'Created event', parameters: [shared],
    post: {parameters: [override], responses: {'200': {description: 'Accepted'}}},
    put: {responses: {'200': {description: 'Accepted'}}},
  }}}, webhooks: {required: {$ref: '#/components/pathItems/Event~1created'}}}
  const entries = getWebhookOperations(document)
  assert.equal(entries.length, 2)
  assert.equal(entries[0].id, 'webhooks/required/post')
  assert.equal(entries[0].operation.summary, 'Created event')
  assert.deepEqual(entries[0].operation.parameters, [override])
  assert.deepEqual(entries[1].operation.parameters, [shared])
  const issues = []
  assert.deepEqual(getWebhookOperations({webhooks: {broken: {$ref: '#/webhooks/broken'}}}, issue => issues.push(issue)), [])
  assert.match(issues[0].message, /Circular reference/)
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

test('sidebar and overview follow declared tag order with encounter order for undeclared tags', async () => {
  const paths = {
    '/authorize': {get: {operationId: 'authorize', tags: ['Authorization']}},
    '/zebra': {get: {operationId: 'zebra', tags: ['Zebra']}},
    '/files': {get: {operationId: 'files', tags: ['Files']}},
    '/ai/ask': {post: {operationId: 'ask', tags: ['AI']}},
    '/alpha': {get: {operationId: 'alpha', tags: ['Alpha']}},
    '/ai/extract': {post: {operationId: 'extract', tags: ['AI']}},
    '/status': {get: {operationId: 'status', summary: 'Status'}},
  }
  for (const tags of [undefined, [], [{name: 'AI'}, {name: 'Files'}, {name: 'Unused'}, {name: 'Authorization'}]]) {
    const document = {info: {title: 'API'}, tags}
    const before = JSON.stringify({document, paths})
    const html = await renderPages({}, '#overview', {document, paths})
    const sidebar = html.match(/<nav aria-label="API reference"[^>]*>(.*?)<\/nav>/s)[1]
    const overview = html.match(/<section[^>]*aria-labelledby="overview-reference"[^>]*>(.*?)<\/section>/s)[1]
    const expected = tags?.length ? ['AI', 'Files', 'Authorization', 'Zebra', 'Alpha'] : ['Authorization', 'Zebra', 'Files', 'AI', 'Alpha']
    assert.match(textContent(sidebar), new RegExp([...expected, 'Status'].join('.*')))
    assert.match(textContent(overview), new RegExp([...expected, 'Endpoints'].join('.*')))
    assert.match(overview, /href="#operations\/ask"/)
    assert.match(overview, /2 endpoints/)
    assert.equal(JSON.stringify({document, paths}), before)
  }
  const direct = await renderPages({}, '#operations/extract', {document: {tags: [{name: 'AI'}]}, paths})
  const sidebar = direct.match(/<nav aria-label="API reference"[^>]*>(.*?)<\/nav>/s)[1]
  assert.match(textContent(sidebar), /AI.*ask.*extract/)
})

test('legacy overview links resolve to the overview page', async () => {
  for (const hash of ['#overview', '#overview/editorial', '#overview/xai']) {
    const html = await renderPages({}, hash, {
      document: {info: {title: 'Files', description: 'Manage **files**.', version: '1.0'}},
      paths: {'/files': {get: {operationId: 'list', tags: ['Files']}}},
    })
    assert.match(html, /Manage <strong>files<\/strong>/)
    assert.match(html, /href="#operations\/list"/)
    assert.equal(parseHtml(html).querySelector('a[href="#overview"][aria-current="page"]')?.textContent.trim(), 'Overview')
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
  assert.match(html, /Basic authentication/)
  assert.match(html, /Use your API key as the username\./)
  assert.doesNotMatch(html, /Bearer token/)
})

test('opens schema hashes and renders the title, description and tabbed example', async () => {
  const html = await renderPages({schemas: {'Person/Details': {
    title: 'Person details', description: 'A person in the workspace.', type: 'object', example: {id: 42}, properties: {id: {type: 'integer', example: 42}},
  }}}, '#schemas/Person%2FDetails')
  assert.match(html, /<h1[^>]*>Person details<\/h1>/)
  assert.equal((html.match(/A person in the workspace\./g) ?? []).length, 1)
  assert.match(html, /JSON schema/)
  assert.match(html, /TypeScript/)
  assert.match(withoutHighlighting(html), /&quot;id&quot;: 42/)
  assert.doesNotMatch(html, />Examples?<\/div>/)
  assert.match(html, /aria-current="page"/)
})

test('array schema pages and response bodies show the referenced item type with array notation', async () => {
  const components = {schemas: {
    LinkSlotListResponse: {type: 'array', items: {$ref: '#/components/schemas/LinkSlot'}},
    LinkSlot: {type: 'object', properties: {rank: {type: 'integer'}}},
  }}
  const paths = {'/slots': {get: {operationId: 'get-slots', responses: {
    200: {description: 'Success', content: {'application/json': {schema: {$ref: '#/components/schemas/LinkSlotListResponse'}}}},
  }}}}
  for (const hash of ['#schemas/LinkSlotListResponse', '#operations/get-slots']) {
    const html = await renderPages(components, hash, {paths})
    const link = parseHtml(html).querySelector('a[href="#schemas/LinkSlot"]')
    assert.ok(link)
    assert.match(link.parentElement.textContent, /LinkSlot\s*\[\]/)
    assert.match(html, />rank<\/div>/)
  }
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
  const html = renderToString(h(Schema, {schema, components, propertyTitle: 'included', level: 1}))
  const text = html.replace(/<[^>]*>/g, '')
  assert.match(text, /\(ComponentGroup \| Incident\)\[\]/)
  assert.ok((text.match(/ComponentGroup/g) ?? []).length >= 2)
  assert.ok((text.match(/Incident/g) ?? []).length >= 2)
})

test('content type selection changes media and handles changing or empty content', async () => {
  const json = {schema: {type: 'object'}, example: {message: 'JSON'}}
  const xml = {schema: {type: 'string'}, example: '<message>XML</message>'}
  let controls
  function Consumer({initialContent}) {
    const [content, setContent] = React.useState(initialContent)
    const selection = useMediaType(content)
    controls = {selection, setContent}
    return h('div', null, selection.type)
  }
  const mounted = await mountReact(h(Consumer, {initialContent: {'application/json': json, 'application/xml': xml}}))
  try {
    assert.equal(controls.selection.type, 'application/json')
    assert.deepEqual(controls.selection.media, json)
    await act(async () => controls.selection.setType('application/xml'))
    assert.deepEqual(controls.selection.media, xml)
    await act(async () => controls.setContent({'text/plain': {example: 'text'}}))
    assert.equal(controls.selection.type, 'text/plain')
    assert.equal(controls.selection.media.example, 'text')
    await act(async () => controls.setContent({}))
    assert.equal(controls.selection.type, '')
    assert.equal(controls.selection.media, undefined)
  } finally { await mounted.unmount() }
})

test('body views expose available media and render the selected schema', async () => {
  const content = {
    'application/json': {schema: {type: 'object', properties: {jsonProperty: {type: 'string'}}}},
    'application/xml': {schema: {type: 'object', properties: {xmlProperty: {type: 'string'}}}},
  }
  for (const [component, props, label] of [
    [RequestBody, {requestBody: {content}}, 'Request body content type'],
    [ResponseContent, {unreferencedResponse: {description: 'Success', content}}, 'Response body content type'],
  ]) {
    const mounted = await mountReact(h(OperationSelectionsProvider, null, h(component, {components: {}, ...props})))
    try {
      assert.ok(mounted.container.querySelector(`[aria-label="${label}"]`))
      assert.match(mounted.container.innerHTML, /title="application\/json"/)
      assert.match(mounted.container.textContent, /jsonProperty/)
      assert.doesNotMatch(mounted.container.textContent, /xmlProperty/)
      const options = await openOptions(mounted, label)
      assert.ok(options.includes('application/json'))
      assert.ok(options.includes('application/xml'))
    } finally { await mounted.unmount() }
  }
})


test('response payload format follows its documentation selection independently of the request', async () => {
  const content = {
    'application/json': {example: {message: 'JSON response'}},
    'application/xml': {example: '<message>XML response</message>'},
  }
  for (const selected of Object.keys(content)) {
    let setType
    function Consumer() {
      setType = useMediaType(content, 'response:200').setType
      return h(Examples, {
        components: {}, base: 'https://example.com', path: '/messages', method: 'post',
        operation: {requestBody: {content}, responses: {200: {description: 'Success', content}}},
      })
    }
    const mounted = await mountReact(h(OperationSelectionsProvider, null, h(Consumer)))
    try {
      await act(async () => setType(selected))
      const html = mounted.container.innerHTML
      const request = withoutHighlighting(html.split('aria-label="Request example"')[1].split('</section>')[0])
      const response = textContent(withoutHighlighting(html.split('aria-label="Response example"')[1].split('</section>')[0]))
      assert.match(request, /Content-Type: application\/json/)
      assert.doesNotMatch(request, /XML response/)
      if (selected === 'application/xml') {
        assert.match(response, /<message>XML response<\/message>/)
        assert.doesNotMatch(response, /JSON response/)
      } else {
        assert.match(response, /"message": "JSON response"/)
        assert.doesNotMatch(response, /XML response/)
      }
    } finally { await mounted.unmount() }
  }
})

test('documentation and examples share selections separately for requests and each response status', async () => {
  const content = {'application/json': {example: 'JSON'}, 'application/xml': {example: 'XML'}}
  let selections
  function Consumer() {
    const [status, setStatus] = React.useState('200')
    selections = {
      requestDocs: useMediaType(content, 'request'),
      requestExample: useMediaType(content, 'request'),
      successDocs: useMediaType(content, 'response:200'),
      errorDocs: useMediaType(content, 'response:400'),
      responseExample: useMediaType(content, `response:${status}`),
      setStatus,
    }
    return h('div')
  }
  const mounted = await mountReact(h(OperationSelectionsProvider, null, h(Consumer)))
  try {
    await act(async () => selections.requestDocs.setType('application/xml'))
    assert.equal(selections.requestExample.media.example, 'XML')
    assert.equal(selections.responseExample.media.example, 'JSON')
    await act(async () => selections.successDocs.setType('application/xml'))
    assert.equal(selections.responseExample.media.example, 'XML')
    await act(async () => selections.setStatus('400'))
    assert.equal(selections.responseExample.media.example, 'JSON')
    await act(async () => selections.setStatus('200'))
    assert.equal(selections.responseExample.media.example, 'XML')
  } finally { await mounted.unmount() }
})

test('selected nested alternatives regenerate parent examples and preserve allOf members without mutating the spec', () => {
  const schema = {type: 'object', example: {paper: 'letter'}, properties: {
    paper: {oneOf: [{type: 'string', example: 'a4'}, {$ref: '#/components/schemas/Size'}]},
    combined: {allOf: [{type: 'object', properties: {a: {const: 1}}}, {type: 'object', properties: {b: {const: 2}}}]},
    items: {type: 'array', items: {anyOf: [{type: 'string'}, {type: 'null'}]}},
  }}
  const document = {components: {schemas: {Size: {type: 'object', properties: {width: {const: 210}}}}}}
  const before = JSON.stringify({schema, document})
  const selections = new Map([
    [compositionPathKey(['properties', 'paper', 'oneOf']), 1],
    [compositionPathKey(['properties', 'combined', 'allOf']), 1],
    [compositionPathKey(['properties', 'items', 'items', 'anyOf']), 1],
  ])
  const projected = selectExampleSchema(schema, document, selections)
  assert.equal(projected.changed, true)
  assert.deepEqual(createSchemaExample(resolveExampleSchema(projected.schema, document.components, document)), {
    paper: {width: 210}, combined: {a: 1, b: 2}, items: [null],
  })
  assert.equal(JSON.stringify({schema, document}), before)
  selections.set(compositionPathKey(['properties', 'paper', 'oneOf']), 0)
  assert.equal(createSchemaExample(selectExampleSchema(schema, document, selections).schema).paper, 'a4')
})

test('composition selections synchronize examples and isolate request, response status and media type', async () => {
  const media = {example: 'authored', schema: {oneOf: [{type: 'string', example: 'a4'}, {type: 'number', example: 42}]}}
  let controls
  function Consumer() {
    controls = {
      docs: useCompositionSelections('request:application/json'),
      request: useCompositionExample(media, 'request:application/json', {}),
      response: useCompositionExample(media, 'response:200:application/json', {}),
      xml: useCompositionExample(media, 'request:application/xml', {}),
    }
    return h('div')
  }
  const mounted = await mountReact(h(OperationSelectionsProvider, null, h(Consumer)))
  try {
    assert.equal(controls.request.example, 'authored')
    await act(async () => controls.docs.select(compositionPathKey(['oneOf']), 1))
    assert.equal(controls.request.example, undefined)
    assert.equal(createSchemaExample(controls.request.schema), 42)
    assert.equal(controls.response.example, 'authored')
    assert.equal(controls.xml.example, 'authored')
    await act(async () => controls.docs.select(compositionPathKey(['oneOf']), 0))
    assert.equal(createSchemaExample(controls.request.schema), 'a4')
  } finally { await mounted.unmount() }
})


test('request curl and response examples serialize selected XML schemas', async () => {
  const components = {schemas: {Pet: {type: 'object', xml: {name: 'pet'}, properties: {
    id: {type: 'integer', example: 7, xml: {attribute: true}},
    name: {type: 'string', example: 'doggie'},
  }}}}
  const content = {'application/xml': {schema: {$ref: '#/components/schemas/Pet'}}}
  const html = renderToString(h(OperationSelectionsProvider, null, h(Examples, {
    components, base: 'https://example.com', path: '/pets', method: 'post',
    operation: {requestBody: {content}, responses: {200: {description: 'Success', content}}},
  })))
  assert.match(html, /Content-Type: application\/xml/)
  assert.match(html, /Bash/)
  assert.match(html, /aria-label="Request example sender"/)
  const code = textContent(withoutHighlighting(html))
  assert.match(code, /<\?xml version="1.0"/)
  assert.equal((code.match(/<pet id="7">/g) ?? []).length, 2)
  assert.equal((code.match(/<name>doggie<\/name>/g) ?? []).length, 2)
})

test('request curl includes a generated JSON payload when no explicit example exists', async () => {
  const content = {'application/json': {schema: {type: 'object', properties: {
    name: {type: 'string', default: 'doggie'}, enabled: {type: 'boolean'},
  }}}}
  const html = renderToString(h(OperationSelectionsProvider, null, h(Examples, {
    components: {}, base: 'https://example.com', path: '/pets', method: 'post',
    operation: {requestBody: {content}},
  })))
  assert.match(html, /Content-Type: application\/json/)
  const code = textContent(withoutHighlighting(html))
  assert.match(code, /-d '\{/)
  assert.match(code, /"name": "doggie"/)
  assert.match(code, /"enabled": true/)
})

test('request picker offers only the payload format matching the selected content type', async () => {
  for (const [type, label] of [
    ['application/json', 'JSON'], ['Application/Problem+JSON; charset=utf-8', 'JSON'],
    ['text/json', 'JSON'], ['application/xml', 'XML'], ['application/problem+xml', 'XML'],
    ['text/xml; charset=utf-8', 'XML'], ['application/x-www-form-urlencoded', null],
    ['multipart/form-data', null], ['', null],
  ]) {
    const mounted = await mountReact(h(OperationSelectionsProvider, null, h(Examples, {
      components: {}, base: 'https://example.com', path: '/pets', method: 'post',
      operation: {requestBody: type ? {content: {[type]: {example: {name: 'doggie'}}}} : undefined},
    })))
    try {
      const options = await openOptions(mounted, 'Request example sender')
      assert.ok(options.includes('Bash'))
      assert.ok(options.includes('Laravel'))
      if (label) {
        assert.ok(options.includes(label))
        assert.ok(!options.includes(label === 'JSON' ? 'XML' : 'JSON'))
      } else assert.ok(!options.includes('JSON') && !options.includes('XML'))
    } finally { await mounted.unmount() }
  }
})
