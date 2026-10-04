import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createXmlExample} from '../src/components/OpenApi/xmlExamples'
import {formatMediaExample, isXmlContentType} from '../src/components/OpenApi/mediaExamples'
import type {Schema} from '../src/components/OpenApi/types'

test('serializes escaped text, attributes, and falsy values', () => {
  const schema: Schema = {xml: {name: 'message'}, properties: {
    id: {xml: {attribute: true}}, enabled: {}, count: {}, empty: {}, nothing: {}, text: {},
  }}
  assert.equal(createXmlExample({id: '"<&\n', enabled: false, count: 0, empty: '', nothing: null, text: 'A&B <tag>\u0000'}, schema),
    '<?xml version="1.0" encoding="UTF-8"?>\n<message id="&quot;&lt;&amp;&#xA;">\n  <enabled>false</enabled>\n  <count>0</count>\n  <empty></empty>\n  <nothing/>\n  <text>A&amp;B &lt;tag&gt;</text>\n</message>')
})

test('respects array wrappers and item names, ignoring unwrapped array names', () => {
  const schema: Schema = {xml: {name: 'pet'}, properties: {
    tags: {type: 'array', xml: {name: 'labels', wrapped: true}, items: {xml: {name: 'tag'}}},
    names: {type: 'array', xml: {name: 'ignored'}, items: {}},
    empty: {type: 'array', xml: {wrapped: true}, items: {}},
  }}
  const xml = createXmlExample({tags: ['a', 'b'], names: ['first', 'second'], empty: []}, schema)
  assert.match(xml, /<labels>\n    <tag>a<\/tag>\n    <tag>b<\/tag>\n  <\/labels>/)
  assert.match(xml, /<names>first<\/names>\n  <names>second<\/names>/)
  assert.match(xml, /<empty\/>/)
  assert.doesNotMatch(xml, /ignored/)
})

test('uses scoped namespaces and prefixed attributes', () => {
  const schema: Schema = {xml: {name: 'pet', prefix: 'p', namespace: 'urn:pets'}, properties: {
    id: {xml: {attribute: true, prefix: 'm', namespace: 'urn:metadata'}},
    name: {xml: {prefix: 'p'}},
    category: {xml: {namespace: 'urn:categories'}},
  }}
  assert.equal(createXmlExample({id: 10, name: 'doggie', category: 'Dogs'}, schema),
    '<?xml version="1.0" encoding="UTF-8"?>\n<p:pet xmlns:p="urn:pets" xmlns:m="urn:metadata" m:id="10">\n  <p:name>doggie</p:name>\n  <category xmlns="urn:categories">Dogs</category>\n</p:pet>')
})

test('keeps conflicting namespace prefixes valid and qualifies namespaced attributes', () => {
  const xml = createXmlExample({id: 7, other: 8}, {xml: {name: 'pet', prefix: 'p', namespace: 'urn:pets'}, properties: {
    id: {xml: {attribute: true, prefix: 'p', namespace: 'urn:ids'}},
    other: {xml: {attribute: true, namespace: 'urn:other'}},
  }})
  assert.match(xml, /xmlns:p="urn:pets" xmlns:p1="urn:ids" p1:id="7" xmlns:ns="urn:other" ns:other="8"/)
  assert.equal((xml.match(/xmlns:p=/g) ?? []).length, 1)
})

test('wrapped array names apply to items when no item name is supplied', () => {
  const xml = createXmlExample({animals: ['dog']}, {properties: {
    animals: {type: 'array', xml: {wrapped: true, name: 'aliens'}, items: {type: 'string'}},
  }})
  assert.match(xml, /<aliens>\n    <aliens>dog<\/aliens>\n  <\/aliens>/)
})

test('preserves XML metadata from referenced and composed schemas', () => {
  const components = {schemas: {
    Pet: {allOf: [
      {type: 'object', properties: {id: {type: 'integer', example: 10, xml: {attribute: true}}}},
      {type: 'object', properties: {name: {type: 'string', example: 'doggie', xml: {name: 'petName'}}}},
    ]},
  }}
  assert.equal(formatMediaExample({schema: {$ref: '#/components/schemas/Pet'}}, 'application/xml', components),
    '<?xml version="1.0" encoding="UTF-8"?>\n<Pet id="10">\n  <petName>doggie</petName>\n</Pet>')
})

test('keeps supplied XML verbatim and serializes supplied object examples', () => {
  const raw = '<?xml version="1.0"?><pet id="7" />'
  assert.equal(formatMediaExample({example: raw}, 'application/xml', {}), raw)
  assert.equal(formatMediaExample({examples: {sample: {$ref: '#/components/examples/Pet'}}}, 'text/xml', {
    examples: {Pet: {value: raw}},
  }), raw)
  assert.match(formatMediaExample({example: {name: 'provided'}, schema: {xml: {name: 'pet'}}}, 'application/xml', {}), /<pet>\n  <name>provided<\/name>\n<\/pet>/)
  assert.match(formatMediaExample({schema: {type: 'string', example: '<tag>'}}, 'application/xml', {}), /<root>&lt;tag&gt;<\/root>/)
})

test('recognizes XML media types with suffixes and parameters and keeps JSON behavior', () => {
  for (const type of ['application/xml', 'text/xml', 'application/problem+xml', 'Application/XML; charset=utf-8']) {
    assert.ok(isXmlContentType(type))
    assert.match(formatMediaExample({schema: {type: 'boolean'}}, type, {}), /<root>true<\/root>/)
  }
  assert.equal(isXmlContentType('application/json'), false)
  assert.equal(formatMediaExample({example: false}, 'application/json', {}), 'false')
  assert.equal(formatMediaExample({example: {id: 1}}, 'application/json', {}), '{\n  "id": 1\n}')
  assert.equal(formatMediaExample(undefined, 'application/xml', {}), '')
  assert.equal(formatMediaExample({schema: {type: 'string'}}, 'application/json', {}, false), '')
})

test('uses a single document root for top-level arrays and terminates recursive data', () => {
  assert.equal(createXmlExample([1, 2], {type: 'array', xml: {name: 'numbers'}, items: {xml: {name: 'number'}}}),
    '<?xml version="1.0" encoding="UTF-8"?>\n<numbers>\n  <number>1</number>\n  <number>2</number>\n</numbers>')
  const cyclic: Record<string, unknown> = {}
  cyclic.child = cyclic
  assert.match(createXmlExample(cyclic), /<child\/>/)
})
