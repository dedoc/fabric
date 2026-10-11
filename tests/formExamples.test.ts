import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createFormFields, isFormContentType} from '../src/components/OpenApi/formExamples'

test('generates individual Petstore form fields with compact complex values', () => {
  const fields = createFormFields({schema: {$ref: '#/components/schemas/Pet'}}, {schemas: {
    Pet: {type: 'object', properties: {
      id: {type: 'integer', example: 10}, name: {type: 'string', example: 'doggie'},
      category: {type: 'object', example: {id: 1, name: 'Dogs'}},
      photoUrls: {type: 'array', example: ['first', 'second']},
      tags: {type: 'array', example: [{id: 0, name: 'string'}]},
    }},
  }})
  assert.deepEqual(fields, [
    ['id', '10'], ['name', 'doggie'],
    ['category', '{"id":1,"name":"Dogs"}'],
    ['photoUrls', 'first'], ['photoUrls', 'second'],
    ['tags', '{"id":0,"name":"string"}'],
  ])
})

test('preserves field names and values for transport-specific encoding', () => {
  assert.deepEqual(createFormFields({example: {'a&b': 'a+b & café=@file', zero: 0, enabled: false, empty: '', nil: null}}, {}), [
    ['a&b', 'a+b & café=@file'], ['zero', '0'],
    ['enabled', 'false'], ['empty', ''], ['nil', ''],
  ])
})

test('honors explicit array and object serialization settings', () => {
  assert.deepEqual(createFormFields({
    example: {comma: [1, 2], spaces: ['a', 'b'], pipes: ['a', 'b'], flat: {id: 1, name: 'Dogs'}, pairs: {id: 1, name: 'Dogs'}, nested: {id: 1}},
    encoding: {
      comma: {explode: false}, spaces: {style: 'spaceDelimited'}, pipes: {style: 'pipeDelimited'},
      flat: {style: 'form'}, pairs: {explode: false}, nested: {style: 'deepObject'},
    },
  }, {}), [
    ['comma', '1,2'], ['spaces', 'a b'], ['pipes', 'a|b'],
    ['id', '1'], ['name', 'Dogs'],
    ['pairs', 'id,1,name,Dogs'], ['nested[id]', '1'],
  ])
})

test('uses named examples and leaves raw form strings to the senders', () => {
  assert.deepEqual(createFormFields({examples: {sample: {$ref: '#/components/examples/Form'}}}, {
    examples: {Form: {value: {name: 'a&b', tags: ['one', 'two']}}},
  }), [['name', 'a&b'], ['tags', 'one'], ['tags', 'two']])
  assert.deepEqual(createFormFields({example: 'name=a%26b&tags=one&tags=two'}, {}), [])
  assert.deepEqual(createFormFields(undefined, {}), [])
  assert.deepEqual(createFormFields({example: {}}, {}), [])
  assert.equal(isFormContentType('Application/X-WWW-Form-Urlencoded; charset=utf-8'), true)
  assert.equal(isFormContentType('application/json'), false)
})
