import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createFormArguments, isFormContentType} from '../src/components/OpenApi/formExamples'

test('generates individual Petstore form fields with compact complex values', () => {
  const fields = createFormArguments({schema: {$ref: '#/components/schemas/Pet'}}, {schemas: {
    Pet: {type: 'object', properties: {
      id: {type: 'integer', example: 10}, name: {type: 'string', example: 'doggie'},
      category: {type: 'object', example: {id: 1, name: 'Dogs'}},
      photoUrls: {type: 'array', example: ['first', 'second']},
      tags: {type: 'array', example: [{id: 0, name: 'string'}]},
    }},
  }})
  assert.deepEqual(fields, [
    ['--data-urlencode', 'id=10'], ['--data-urlencode', 'name=doggie'],
    ['--data-urlencode', 'category={"id":1,"name":"Dogs"}'],
    ['--data-urlencode', 'photoUrls=first'], ['--data-urlencode', 'photoUrls=second'],
    ['--data-urlencode', 'tags={"id":0,"name":"string"}'],
  ])
})

test('keeps reserved value characters for curl to encode and encodes field names', () => {
  assert.deepEqual(createFormArguments({example: {'a&b': 'a+b & café=@file', zero: 0, enabled: false, empty: '', nil: null}}, {}), [
    ['--data-urlencode', 'a%26b=a+b & café=@file'], ['--data-urlencode', 'zero=0'],
    ['--data-urlencode', 'enabled=false'], ['--data-urlencode', 'empty='], ['--data-urlencode', 'nil='],
  ])
})

test('honors explicit array and object serialization settings', () => {
  assert.deepEqual(createFormArguments({
    example: {comma: [1, 2], spaces: ['a', 'b'], pipes: ['a', 'b'], flat: {id: 1, name: 'Dogs'}, pairs: {id: 1, name: 'Dogs'}, nested: {id: 1}},
    encoding: {
      comma: {explode: false}, spaces: {style: 'spaceDelimited'}, pipes: {style: 'pipeDelimited'},
      flat: {style: 'form'}, pairs: {explode: false}, nested: {style: 'deepObject'},
    },
  }, {}), [
    ['--data-urlencode', 'comma=1,2'], ['--data-urlencode', 'spaces=a b'], ['--data-urlencode', 'pipes=a|b'],
    ['--data-urlencode', 'id=1'], ['--data-urlencode', 'name=Dogs'],
    ['--data-urlencode', 'pairs=id,1,name,Dogs'], ['--data-urlencode', 'nested%5Bid%5D=1'],
  ])
})

test('uses named examples and preserves already encoded form strings', () => {
  assert.deepEqual(createFormArguments({examples: {sample: {$ref: '#/components/examples/Form'}}}, {
    examples: {Form: {value: 'name=a%26b&tags=one&tags=two'}},
  }), [['--data-raw', 'name=a%26b&tags=one&tags=two']])
  assert.deepEqual(createFormArguments(undefined, {}), [])
  assert.deepEqual(createFormArguments({example: {}}, {}), [])
  assert.equal(isFormContentType('Application/X-WWW-Form-Urlencoded; charset=utf-8'), true)
  assert.equal(isFormContentType('application/json'), false)
})
