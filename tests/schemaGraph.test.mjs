import assert from 'node:assert/strict'
import {after, test} from 'node:test'
import {createServer} from 'vite'

const server = await createServer({configFile: false, server: {middlewareMode: true, hmr: false}})
after(() => server.close())
const {resolveExampleSchema, createSchemaExample} = await server.ssrLoadModule('/src/components/OpenApi/schemaExamples.ts')
const {selectExampleSchema, compositionPathKey} = await server.ssrLoadModule('/src/components/OpenApi/compositionExamples.ts')
const {schemaFlag, directionalExample} = await server.ssrLoadModule('/src/components/OpenApi/schemaUsage.ts')
const {formatMediaExample} = await server.ssrLoadModule('/src/components/OpenApi/mediaExamples.ts')
const {createRequestExample} = await server.ssrLoadModule('/src/components/OpenApi/requestExamples/index.ts')

function sharedDocument(depth) {
  const schemas = {Leaf: {type: 'string'}}
  let name = 'Leaf'
  for (let index = 0; index < depth; index++) {
    const reference = {$ref: `#/components/schemas/${name}`}
    name = `Layer${index}`
    schemas[name] = {type: 'object', properties: {left: {...reference}, right: {...reference}}}
  }
  return {document: {openapi: '3.1.0', components: {schemas}}, schema: schemas[name]}
}

test('thirteen schemas resolve to thirteen shared nodes instead of 8191 copies', () => {
  const {document, schema} = sharedDocument(12)
  const before = JSON.stringify(document)
  const resolved = resolveExampleSchema(schema, document.components, document)
  const nodes = new Set()
  let node = resolved
  while (node) {
    nodes.add(node)
    if (!node.properties) break
    assert.equal(node.properties.left, node.properties.right)
    node = node.properties.left
  }
  assert.equal(nodes.size, 13)
  assert.equal(resolveExampleSchema(schema, document.components, document), resolved)
  assert.equal(resolveExampleSchema(resolved, document.components, document), resolved)
  assert.equal(resolveExampleSchema({$ref: '#/components/schemas/Layer11'}, document.components, document), resolved)
  assert.equal(JSON.stringify(document), before)
})

test('graph construction handles long reference graphs without recursive expansion', () => {
  const {document, schema} = sharedDocument(5000)
  const resolved = resolveExampleSchema(schema, document.components, document)
  assert.equal(resolved.properties.left, resolved.properties.right)
  assert.throws(() => createSchemaExample(resolved), /size or depth limit/)
})

test('generated output has a global budget even when the source graph is small', () => {
  const {document, schema} = sharedDocument(20)
  const resolved = resolveExampleSchema(schema, document.components, document)
  assert.throws(() => createSchemaExample(resolved), /generation size or depth limit/)
})

test('recursive edges retain their target and do not invent nullable constraints', () => {
  const schema = {type: 'object', properties: {child: {$ref: '#/components/schemas/Node'}}}
  const document = {components: {schemas: {Node: schema}}}
  const resolved = resolveExampleSchema(schema, document.components, document)
  assert.equal(resolved.properties.child, resolved)
  assert.equal(resolved.properties.child.type, 'object')
  assert.deepEqual(createSchemaExample(resolved), {})
  const required = {...schema, required: ['child']}
  const requiredDocument = {components: {schemas: {Node: required}}}
  assert.throws(() => createSchemaExample(resolveExampleSchema(required, requiredDocument.components, requiredDocument)), /finite value.*recursive/)
  const nullable = {...required, nullable: true}
  const nullableDocument = {components: {schemas: {Node: nullable}}}
  assert.deepEqual(createSchemaExample(resolveExampleSchema(nullable, nullableDocument.components, nullableDocument)), {child: null})
})

test('recursive authored values remain usable for direction filtering and JSON/XML formatting', () => {
  const schema = {type: 'object', properties: {
    secret: {type: 'string', writeOnly: true},
    child: {$ref: '#/components/schemas/Node'},
  }}
  const document = {components: {schemas: {Node: schema}}}
  const value = {secret: 'outer', child: {secret: 'inner', child: {}}}
  const resolved = resolveExampleSchema(schema, document.components, document)
  assert.deepEqual(directionalExample(value, resolved, 'response'), {child: {child: {}}})
  const media = {schema, example: value}
  assert.equal(formatMediaExample(media, 'application/json', document.components, true, document, undefined, 'response'), '{\n  "child": {\n    "child": {}\n  }\n}')
  assert.match(formatMediaExample(media, 'application/xml', document.components, true, document, undefined, 'response'), /<child>/)
  const request = createRequestExample('', '/', 'post', 'multipart/form-data', media, document.components, document)
  assert.ok(request.formFields.some(([name]) => name === 'child'))
})

test('recursive generation uses finite null alternatives and empty arrays when allowed', () => {
  const schema = {type: 'object', required: ['child'], properties: {
    child: {anyOf: [{$ref: '#/components/schemas/Node'}, {type: 'null'}]},
  }}
  const document = {components: {schemas: {Node: schema}}}
  assert.deepEqual(createSchemaExample(resolveExampleSchema(schema, document.components, document)), {child: null})
  const array = {type: 'array', items: {$ref: '#/components/schemas/Array'}}
  const arrayDocument = {components: {schemas: {Array: array}}}
  assert.deepEqual(createSchemaExample(resolveExampleSchema(array, arrayDocument.components, arrayDocument)), [])
  const requiredArray = {...array, minItems: 1}
  const requiredDocument = {components: {schemas: {Array: requiredArray}}}
  assert.throws(() => createSchemaExample(resolveExampleSchema(requiredArray, requiredDocument.components, requiredDocument)), /finite value.*recursive/)
})

test('composition cycles terminate in schema flags, direction filtering and serialization', () => {
  const schema = {allOf: [{$ref: '#/components/schemas/Loop'}], properties: {id: {type: 'string'}}}
  const document = {components: {schemas: {Loop: schema}}}
  const resolved = resolveExampleSchema(schema, document.components, document)
  assert.equal(resolved.allOf[0], resolved)
  assert.equal(schemaFlag(resolved, 'readOnly'), false)
  assert.deepEqual(directionalExample({id: 'a'}, resolved, 'response'), {id: 'a'})
  const media = {schema, example: {id: 'a'}}
  assert.match(formatMediaExample(media, 'application/xml', document.components, true, document, undefined, 'response'), /<id>a<\/id>/)
  assert.doesNotThrow(() => createRequestExample('', '/', 'post', 'multipart/form-data', media, document.components, document))
})

test('cached graphs replay unresolved-reference diagnostics and isolate documents', () => {
  const schema = {properties: {bad: {$ref: '#/components/schemas/Missing'}}}
  const document = {components: {}}
  for (let index = 0; index < 2; index++) {
    const issues = []
    resolveExampleSchema(schema, document.components, document, issue => issues.push(issue))
    assert.equal(issues.length, 1)
    assert.match(issues[0].message, /not found/)
  }
  const other = {components: {schemas: {Missing: {type: 'string'}}}}
  const issues = []
  const resolved = resolveExampleSchema(schema, other.components, other, issue => issues.push(issue))
  assert.equal(issues.length, 0)
  assert.equal(resolved.properties.bad.type, 'string')
})

test('schema sibling conjunctions remain distinct from their shared target', () => {
  const target = {type: 'object', properties: {id: {type: 'integer'}}}
  const schema = {properties: {
    first: {$ref: '#/components/schemas/Target'},
    second: {$ref: '#/components/schemas/Target', properties: {label: {type: 'string'}}},
  }}
  const document = {openapi: '3.1.0', components: {schemas: {Target: target}}}
  const resolved = resolveExampleSchema(schema, document.components, document)
  assert.notEqual(resolved.properties.first, resolved.properties.second)
  assert.equal(resolved.properties.second.allOf[0], resolved.properties.first)
  assert.equal(resolved.properties.first.properties.label, undefined)
})

test('composition projection only copies paths with selections, retaining other subgraphs', () => {
  const {document, schema} = sharedDocument(20)
  assert.equal(selectExampleSchema(schema, document, new Map()).schema, schema)
  const choice = {oneOf: [{type: 'string'}, {type: 'integer'}]}
  const root = {properties: {choice, shared: schema}}
  const selected = selectExampleSchema(root, document, new Map([[compositionPathKey(['properties', 'choice', 'oneOf']), 1]]))
  assert.equal(selected.changed, true)
  assert.equal(selected.schema.properties.shared, schema)
  assert.equal(selected.schema.properties.choice.oneOf[0].type, 'integer')
  assert.equal(choice.oneOf.length, 2)
})
