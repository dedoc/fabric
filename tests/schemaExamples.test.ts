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
  assert.deepEqual(createSchemaExample(resolveExampleSchema({$ref: '#/components/schemas/Item', example: {id: 7}}, components)), {id: 7})
})

test('terminates recursive schemas and handles missing schemas', () => {
  const recursive: Schema = {type: 'object', properties: {child: {$ref: '#/components/schemas/Node'}}}
  assert.deepEqual(createSchemaExample(resolveExampleSchema(recursive, {schemas: {Node: recursive}})), {child: null})
  const cycle: Schema = {type: 'object', properties: {}}
  cycle.properties!.child = cycle
  assert.deepEqual(createSchemaExample(cycle), {child: null})
  assert.equal(createSchemaExample(undefined), undefined)
})
