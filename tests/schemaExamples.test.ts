import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createSchemaExample, resolveExampleSchema} from '../src/components/OpenApi/schemaExamples'
import type {Schema} from '../src/components/OpenApi/types'

test('uses fixed values for nested objects and arrays', () => {
  assert.deepEqual(createSchemaExample({type: 'object', properties: {
    name: {type: 'string'}, count: {type: 'integer'}, score: {type: 'number'}, enabled: {type: 'boolean'},
    tags: {type: 'array', items: {type: 'string'}}, nullable: {type: ['null', 'string']}, empty: {type: 'null'},
  }}), {name: 'string', count: 0, score: 0, enabled: true, tags: ['string'], nullable: 'string', empty: null})
})

test('preserves supplied examples, including falsy values', () => {
  for (const value of [null, false, 0, '', {id: 'provided'}]) {
    assert.deepEqual(createSchemaExample({type: 'object', example: value}), value)
  }
  assert.deepEqual(createSchemaExample({examples: [{value: {id: 'named'}}]}), {id: 'named'})
  assert.equal(createSchemaExample({examples: ['provided']}), 'provided')
  assert.equal(createSchemaExample({example: false, default: true}), false)
})

test('uses const values, including falsy values and referenced properties', () => {
  for (const value of ['Pong!', null, false, 0, '', {message: 'Pong!'}, ['Pong!']]) {
    assert.deepEqual(createSchemaExample({const: value, default: 'fallback'}), value)
  }
  const components = {schemas: {Message: {type: 'string', const: 'Pong!'}}}
  assert.deepEqual(createSchemaExample(resolveExampleSchema({properties: {
    message: {$ref: '#/components/schemas/Message'},
  }}, components)), {message: 'Pong!'})
  assert.equal(createSchemaExample({const: 'Pong!', example: 'provided'}), 'provided')
})

test('prefers nested examples, defaults and enum values', () => {
  assert.deepEqual(createSchemaExample({properties: {
    name: {type: 'string', example: 'sample'}, status: {enum: ['completed', 'pending']}, count: {default: 5},
  }}), {name: 'sample', status: 'completed', count: 5})
})

test('combines allOf objects and chooses the first alternative', () => {
  assert.deepEqual(createSchemaExample({allOf: [{properties: {id: {type: 'integer'}}}, {properties: {name: {type: 'string'}}}]}), {id: 0, name: 'string'})
  assert.equal(createSchemaExample({oneOf: [{type: 'string'}, {type: 'number'}]}), 'string')
  assert.equal(createSchemaExample({anyOf: [{type: 'boolean'}, {type: 'string'}]}), true)
  assert.deepEqual(createSchemaExample({type: 'array', prefixItems: [{type: 'string'}, {type: 'integer'}]}), ['string', 0])
})

test('resolves nested references and leaves the original schema intact', () => {
  const components = {schemas: {Item: {properties: {id: {type: 'integer'}}}}}
  const schema = {type: 'array', items: {$ref: '#/components/schemas/Item'}}
  const original = JSON.stringify({schema, components})
  assert.deepEqual(createSchemaExample(resolveExampleSchema(schema, components)), [{id: 0}])
  assert.equal(JSON.stringify({schema, components}), original)
  assert.deepEqual(createSchemaExample(resolveExampleSchema({$ref: '#/components/schemas/Item', example: {id: 7}}, components, {openapi: '3.1.0', components})), {id: 7})
  assert.deepEqual(createSchemaExample(resolveExampleSchema({$ref: '#/components/schemas/Item', example: {id: 7}}, components, {openapi: '3.0.3', components})), {id: 0})
})

test('terminates recursive schemas and handles missing schemas', () => {
  const recursive: Schema = {type: 'object', properties: {child: {$ref: '#/components/schemas/Node'}}}
  assert.deepEqual(createSchemaExample(resolveExampleSchema(recursive, {schemas: {Node: recursive}})), {})
  const cycle: Schema = {type: 'object', properties: {}}
  cycle.properties!.child = cycle
  assert.deepEqual(createSchemaExample(cycle), {})
  assert.equal(createSchemaExample(undefined), undefined)
})

test('generates valid temporal string samples', () => {
  const sample = (format: string) => createSchemaExample({type: 'string', format}) as string
  assert.equal(new Date(sample('date-time')).toISOString(), '2024-01-15T12:30:00.000Z')
  assert.equal(new Date(sample('http-date')).toISOString(), '2024-01-15T12:30:00.000Z')
  assert.equal(Number(sample('unixtime')), Date.parse(sample('date-time')) / 1000)
  assert.match(sample('date'), /^\d{4}-\d{2}-\d{2}$/)
  assert.match(sample('date-time-local'), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/)
  assert.match(sample('time'), /^\d{2}:\d{2}:\d{2}Z$/)
  assert.match(sample('time-local'), /^\d{2}:\d{2}:\d{2}$/)
  assert.match(sample('duration'), /^P\d+DT\d+H\d+M$/)
})

test('generates supported string formats and common aliases without inventing binary data', () => {
  const formats = [
    'base64url', 'char', 'commonmark', 'date-time-local', 'date-time', 'date',
    'decimal', 'decimal128', 'duration', 'email', 'hostname', 'html', 'http-date', 'idn-email',
    'idn-hostname', 'int64', 'ipv4-cidr', 'ipv4', 'ipv6-cidr', 'ipv6', 'iri-reference', 'iri',
    'json-pointer', 'language', 'media-range', 'password', 'regex', 'relative-json-pointer',
    'sf-binary', 'sf-boolean', 'sf-string', 'sf-token', 'time-local', 'time', 'uint64', 'unixtime',
    'uri-reference', 'uri-template', 'uri', 'uuid', 'url', 'base64', 'markdown', 'json',
  ]
  for (const format of formats) {
    const value = createSchemaExample({type: 'string', format})
    assert.equal(typeof value, 'string', format)
    assert.notEqual(value, 'string', format)
    assert.equal(createSchemaExample({type: ['null', 'string'], format}), value, format)
  }
  for (const format of ['binary', 'byte']) {
    assert.throws(() => createSchemaExample({type: 'string', format}), /Binary samples require a supplied file/)
  }
})

test('generates usable encoded, identifier, network, and structured string samples', () => {
  const sample = (format: string) => createSchemaExample({type: 'string', format}) as string
  for (const format of ['base64', 'base64url']) {
    assert.equal(Buffer.from(sample(format), format === 'base64url' ? 'base64url' : 'base64').toString(), 'Hello, world!')
  }
  assert.equal(Buffer.from(sample('sf-binary').slice(1, -1), 'base64').toString(), 'Hello, world!')
  assert.match(sample('uuid'), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  assert.equal(new URL(sample('uri')).protocol, 'https:')
  assert.equal(new URL(sample('uri-reference'), 'https://example.com').pathname, '/resources/123')
  assert.equal(new URL(sample('iri')).hostname, 'xn--r8jz45g.xn--zckzah')
  assert.ok(new RegExp(sample('regex')).test('Example123'))
  assert.deepEqual(JSON.parse(sample('json')), {message: 'Hello, world!'})
  assert.equal(JSON.parse(sample('sf-string')), 'Hello, world!')
})

test('preserves explicit values before generating formats and falls back for custom formats', () => {
  for (const field of ['example', 'const', 'default'] as const) {
    assert.equal(createSchemaExample({type: 'string', format: 'uuid', [field]: 'provided'}), 'provided')
  }
  assert.equal(createSchemaExample({type: 'string', format: 'uuid', examples: ['provided']}), 'provided')
  assert.equal(createSchemaExample({type: 'string', format: 'uuid', enum: ['provided']}), 'provided')
  for (const format of [undefined, '', 'custom-format', 'constructor', '__proto__']) {
    assert.equal(createSchemaExample({type: 'string', format}), 'string')
  }
  assert.deepEqual(createSchemaExample({type: 'object', properties: {
    email: {type: 'string', format: 'email'}, ids: {type: 'array', items: {type: 'string', format: 'uuid'}},
  }}), {email: 'user@example.com', ids: ['123e4567-e89b-42d3-a456-426614174000']})
})
