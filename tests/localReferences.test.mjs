import assert from 'node:assert/strict'
import {after, test} from 'node:test'
import {createServer} from 'vite'

const server = await createServer({configFile: false, server: {middlewareMode: true, hmr: false}})
after(() => server.close())
const {resolveLocalReference} = await server.ssrLoadModule('/src/components/OpenApi/localReferences.ts')
const {resolveReference} = await server.ssrLoadModule('/src/components/OpenApi/references.ts')

test('local pointers decode URI fragments and escaped tokens in the correct order', () => {
  const document = {components: {schemas: {
    'A/B~C': {type: 'string'}, '~1': {type: 'integer'}, '雪 space': false, '': null,
  }}}
  for (const [reference, value] of [
    ['#/components/schemas/A~1B~0C', document.components.schemas['A/B~C']],
    ['#%2Fcomponents%2Fschemas%2FA~1B~0C', document.components.schemas['A/B~C']],
    ['#/components/schemas/~01', document.components.schemas['~1']],
    ['#/components/schemas/%E9%9B%AA%20space', false],
    ['#/components/schemas/', null],
    ['#', document],
  ]) {
    const result = resolveLocalReference(document, reference)
    assert.equal(result.status, 'resolved')
    assert.equal(result.value, value)
  }
})

test('local pointers resolve paths, webhooks, nested schemas and array entries', () => {
  const document = {
    paths: {'/pets': {get: {parameters: [{name: 'id', in: 'query'}]}}},
    webhooks: {created: {post: {responses: {'204': {description: 'Accepted'}}}}},
    components: {schemas: {Pet: {properties: {name: {type: 'string'}}}}},
  }
  for (const [reference, value] of [
    ['#/paths/~1pets/get/parameters/0', document.paths['/pets'].get.parameters[0]],
    ['#/webhooks/created/post/responses/204', document.webhooks.created.post.responses['204']],
    ['#/components/schemas/Pet/properties/name', document.components.schemas.Pet.properties.name],
  ]) {
    assert.deepEqual(resolveLocalReference(document, reference), {status: 'resolved', value, chain: [reference]})
  }
})

test('reference chains reach concrete targets without mutating or merging siblings', () => {
  const document = {aliases: {A: {$ref: '#/aliases/B', description: 'Override'}, B: {$ref: '#/target'}}, target: {type: 'string'}}
  const snapshot = structuredClone(document)
  assert.deepEqual(resolveLocalReference(document, '#/aliases/A'), {
    status: 'resolved', value: document.target, chain: ['#/aliases/A', '#/aliases/B', '#/target'],
  })
  assert.deepEqual(document, snapshot)
})

test('missing, malformed, external and circular references have distinct results', () => {
  const document = {a: {$ref: '#/b'}, b: {$ref: '#/%61'}, broken: {$ref: '#/missing'}, external: {$ref: 'other.yaml#/Pet'}, invalid: {$ref: 42}, list: [false]}
  for (const [reference, status] of [
    ['#/missing', 'missing'], ['#/broken', 'missing'], ['#/toString', 'missing'],
    ['#/list/01', 'missing'], ['#/list/-', 'missing'], ['#/list/length', 'missing'],
    ['#/list/1', 'missing'], ['#/list/0/child', 'missing'],
    ['#anchor', 'invalid'], ['#/%ZZ', 'invalid'], ['#/bad~2token', 'invalid'],
    ['#/bad~', 'invalid'], ['#/invalid', 'invalid'],
    ['other.yaml#/Pet', 'external'], ['#/external', 'external'],
    ['#/a', 'circular'],
  ]) {
    assert.equal(resolveLocalReference(document, reference).status, status, reference)
  }
  assert.deepEqual(resolveLocalReference(document, '#/broken').chain, ['#/broken', '#/missing'])
  assert.equal(resolveLocalReference(document, '#/broken').reference, '#/missing')
  assert.deepEqual(resolveLocalReference(document, '#/a').chain, ['#/a', '#/b', '#/%61'])
  assert.equal(resolveLocalReference({$ref: '#'}, '#').status, 'circular')
})

test('recursive schemas resolve without traversing nested references', () => {
  const document = {components: {schemas: {
    Node: {type: 'object', properties: {child: {$ref: '#/components/schemas/Node'}}},
    A: {type: 'object', properties: {b: {$ref: '#/components/schemas/B'}}},
    B: {type: 'object', properties: {a: {$ref: '#/components/schemas/A'}}},
  }}}
  for (const name of ['Node', 'A', 'B']) {
    const result = resolveLocalReference(document, `#/components/schemas/${name}`)
    assert.equal(result.status, 'resolved')
    assert.equal(result.value, document.components.schemas[name])
  }
  const child = resolveLocalReference(document, '#/components/schemas/Node/properties/child')
  assert.equal(child.status, 'resolved')
  assert.equal(child.value, document.components.schemas.Node)
})

test('Reference Object siblings depend on the OpenAPI version, including intermediate aliases', () => {
  const components = {responses: {
    Target: {description: 'Target', content: {}},
    Alias: {$ref: '#/components/responses/Target', description: 'Alias', content: {ignored: {}}},
  }}
  const entry = {$ref: '#/components/responses/Alias', description: 'Local', summary: 'Summary', content: {ignored: {}}}
  assert.deepEqual(resolveReference({openapi: '3.0.3', components}, entry).value, components.responses.Target)
  assert.deepEqual(resolveReference({openapi: '3.1.0', components}, entry).value, {description: 'Local', summary: 'Summary', content: {}})
  assert.equal(resolveReference({openapi: '3.1.0', components}, {$ref: '#/components/responses/Alias'}).value.description, 'Alias')
})

test('3.1 schema siblings retain both constraint sets; 3.0 ignores siblings', () => {
  const target = {type: 'integer', minimum: 5}
  const document = {openapi: '3.1.0', components: {schemas: {Target: target}}}
  const entry = {$ref: '#/components/schemas/Target', minimum: 0, maximum: 10}
  const result = resolveReference(document, entry, 'schema')
  assert.deepEqual(result.value, {minimum: 0, maximum: 10, allOf: [target]})
  assert.deepEqual(resolveReference({...document, openapi: '3.0.3'}, entry, 'schema').value, target)
  assert.deepEqual(target, {type: 'integer', minimum: 5})
})

test('Path Item siblings preserve non-conflicting fields and disclose undefined conflicts', () => {
  const document = {paths: {'/source': {get: {summary: 'Target'}}}}
  const entry = {$ref: '#/paths/~1source', post: {summary: 'Added'}, get: {summary: 'Conflict'}}
  const result = resolveReference(document, entry, 'pathItem')
  assert.equal(result.value.get.summary, 'Target')
  assert.equal(result.value.post.summary, 'Added')
  assert.match(result.issues[0].message, /Conflicting Path Item siblings \(get\)/)
})

test('object resolution reports chains with no concrete target and external targets without fetching', () => {
  const document = {components: {schemas: {A: {$ref: '#/components/schemas/B'}, B: {$ref: '#/components/schemas/A'}}}}
  assert.match(resolveReference(document, document.components.schemas.A, 'schema').issues[0].message, /Circular reference/)
  assert.match(resolveReference(document, {$ref: '#/missing'}).issues[0].message, /not found/)
  assert.match(resolveReference(document, {$ref: 'models.yaml#/Pet'}).issues[0].message, /bundle this specification/)
})

test('schema resource scopes and unsupported target shapes produce explicit diagnostics', () => {
  const document = {openapi: '3.1.0', components: {schemas: {Scoped: {$id: 'resource.json', type: 'string'}, Boolean: false}}}
  assert.match(resolveReference(document, {$ref: '#/components/schemas/Scoped'}, 'schema').issues[0].message, /resource scopes/)
  assert.match(resolveReference(document, {$ref: '#/components/schemas/Boolean'}, 'schema').issues[0].message, /supported object/)
})
