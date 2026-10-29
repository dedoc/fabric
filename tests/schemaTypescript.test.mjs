import assert from 'node:assert/strict'
import {after, test} from 'node:test'
import {fileURLToPath} from 'node:url'
import ts from 'typescript'
import {createServer as createHttpServer} from 'node:http'
import {createServer} from 'vite'
import React, {act} from 'react'
import {createRoot} from 'react-dom/client'
import {JSDOM} from 'jsdom'

const server = await createServer({configFile: false, resolve: {alias: {'@': fileURLToPath(new URL('../src', import.meta.url))}}, server: {middlewareMode: true, hmr: {server: createHttpServer()}}})
after(() => server.close())
const {createSchemaTypescript} = await server.ssrLoadModule('/src/core/openapi/schemaTypescript.ts')
const {default: SchemaExamples} = await server.ssrLoadModule('/src/components/OpenApi/SchemaExamples.tsx')
const {DocumentContext} = await server.ssrLoadModule('/src/react/context.tsx')
const h = React.createElement
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const nextTick = () => act(async () => {})

function checkTypes(code, assignments = '') {
  const path = '/fabric-generated-types.ts'
  const options = {noEmit: true, strict: true, target: ts.ScriptTarget.ES2022, types: []}
  const host = ts.createCompilerHost(options)
  const original = host.getSourceFile.bind(host)
  host.getSourceFile = (file, version, ...rest) => file === path
    ? ts.createSourceFile(path, `${code}\n${assignments}`, version, true)
    : original(file, version, ...rest)
  const diagnostics = ts.getPreEmitDiagnostics(ts.createProgram([path], options, host))
  assert.deepEqual(diagnostics.map(diagnostic => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')), [])
}

test('emits required and optional properties, escaped keys, arrays and neutral annotations', () => {
  const schema = {type: 'object', additionalProperties: false, required: ['id', 'untyped'], properties: {
    id: {type: 'integer', readOnly: true}, secret: {type: 'string', writeOnly: true},
    'quote"\nkey': {type: 'boolean'}, tags: {type: 'array', items: {type: 'string'}},
  }}
  const before = JSON.stringify(schema)
  const {code} = createSchemaTypescript(schema, {}, 'Person/Details')
  assert.match(code, /export type Person_Details/)
  assert.match(code, /id: number;/)
  assert.match(code, /secret\?: string;/)
  assert.match(code, /untyped: unknown;/)
  checkTypes(code, `const person: Person_Details = {id: 1, untyped: null};
    // @ts-expect-error id is required
    const missing: Person_Details = {untyped: null};
    // @ts-expect-error integer maps to number
    const wrong: Person_Details = {id: '1', untyped: null};`)
  assert.equal(JSON.stringify(schema), before)
})

test('preserves literals, nullability, enum unions and all composition branches', () => {
  const schema = {allOf: [{properties: {id: {type: 'integer'}}, required: ['id']}], properties: {
    status: {enum: ['ready', 'done', null]}, zero: {const: 0}, flag: {const: false}, empty: {const: ''},
    structured: {const: {key: ['literal', 0]}}, nullable: {type: 'string', nullable: true},
    choice: {oneOf: [{type: 'string'}, {type: 'boolean'}]},
    union: {anyOf: [{type: 'number'}, {type: 'null'}]}, typed: {type: ['string', 'null']},
  }}
  const {code} = createSchemaTypescript(schema, {})
  checkTypes(code, `const value: Schema = {id: 2, choice: false, nullable: null, status: 'ready'};
    // @ts-expect-error allOf keeps required fields
    const missing: Schema = {};
    // @ts-expect-error enum keeps every allowed literal, but no other values
    const invalid: Schema = {id: 2, status: 'unknown'};`)
  assert.match(code, /string \| boolean/)
  assert.match(code, /number \| null/)
  assert.match(code, /flag\?: false/)
  assert.match(code, /empty\?: ""/)
})

test('schema and property names produce valid TypeScript', () => {
  const schema = {properties: {
    id: {type: 'number'}, default: {type: 'string'}, café: {type: 'boolean'},
    'has-dash': {type: 'string'}, '123': {type: 'number'},
    literal: {const: {id: 1, 'has space': true}},
  }, required: ['requiredField']}
  const {code} = createSchemaTypescript(schema, {}, 'Person')
  checkTypes(code)
  for (const name of ['123User', 'class', 'string', 'café']) {
    const result = createSchemaTypescript({type: 'string'}, {}, name)
    checkTypes(result.code)
  }
})


test('merged objects intersect duplicate properties, combine required names and retain index constraints', () => {
  const schema = {properties: {shared: {type: 'string'}}, allOf: [
    {required: ['shared', 'elsewhere'], properties: {shared: {enum: ['active', 'archived']}}},
    {properties: {elsewhere: {type: 'number'}, map: {allOf: [{properties: {id: {type: 'number'}}}, {additionalProperties: {type: 'number'}}]}}},
  ]}
  const {code} = createSchemaTypescript(schema, {})
  assert.equal((code.match(/shared:/g) ?? []).length, 1)
  assert.match(code, /elsewhere: number;/)
  assert.match(code, /\[key: string\]: number/)
  checkTypes(code, `const valid: Schema = {shared: 'active', elsewhere: 1, map: {id: 2, extra: 3}};
    // @ts-expect-error all duplicate property constraints must hold
    const wrong: Schema = {shared: 'other', elsewhere: 1};
    // @ts-expect-error required in one member remains required
    const missing: Schema = {shared: 'active'};
    // @ts-expect-error explicit map constraints remain
    const wrongMap: Schema = {shared: 'active', elsewhere: 1, map: {extra: 'no'}};`)
})

test('allOf merging keeps named object intersections and nullable alternatives', () => {
  const document = {components: {schemas: {Base: {properties: {id: {type: 'string'}}, required: ['id']}}}}
  const {code} = createSchemaTypescript({allOf: [
    {$ref: '#/components/schemas/Base'},
    {properties: {name: {type: 'string'}}, required: ['name']},
    {properties: {nullable: {allOf: [{properties: {a: {type: 'string'}}, nullable: true}, {properties: {b: {type: 'number'}}}]}}},
  ]}, document)
  assert.match(code, / & Base;/)
  assert.match(code, /\| null/)
  checkTypes(code, `const valid: Schema = {id: '1', name: 'file', nullable: {a: 'a', b: 1}};
    // @ts-expect-error named reference still requires id
    const missing: Schema = {name: 'file'};
    // @ts-expect-error nullable member alone cannot make the whole intersection nullable
    const invalid: Schema = {id: '1', name: 'file', nullable: null};`)
})

test('primitive enums retain literal constraints in properties and array items', () => {
  const schema = {properties: {
    status: {type: 'string', enum: ['active', 'archived']},
    count: {type: 'integer', enum: [0, 1]}, flag: {type: 'boolean', const: false},
    nullable: {type: ['string', 'null'], enum: ['active', null]},
    mixed: {type: 'string', enum: ['active', 1]},
    grouped: {type: 'array', items: {type: 'string', enum: ['active', 'archived']}},
  }}
  const {code} = createSchemaTypescript(schema, {}, 'ProjectAlias')
  assert.match(code, /count\?: 0 \| 1;/)
  assert.match(code, /flag\?: false;/)
  assert.match(code, /nullable\?: "active" \| null;/)
  checkTypes(code, `const valid: ProjectAlias = {status: 'active', grouped: ['archived']};
    // @ts-expect-error enum rejects other strings
    const invalid: ProjectAlias = {status: 'other'};
    // @ts-expect-error base type still excludes incompatible enum members
    const mixed: ProjectAlias = {mixed: 1};
    // @ts-expect-error array items retain the enum union
    const array: ProjectAlias = {grouped: ['other']};`)
})

test('represents maps, unknown schemas, empty enums and tuple positions', () => {
  const schema = {properties: {
    map: {type: 'object', additionalProperties: {type: 'integer'}},
    anything: {}, impossible: {enum: []},
    tuple: {type: 'array', minItems: 1, prefixItems: [{type: 'string'}, {type: 'integer'}], items: {type: 'boolean'}},
  }}
  const {code} = createSchemaTypescript(schema, {})
  assert.match(code, /\[key: string\]: number/)
  assert.match(code, /anything\?: unknown/)
  assert.match(code, /impossible\?: never/)
  checkTypes(code, `const value: Schema = {map: {count: 1}, tuple: ['first', 2, true]};
    // @ts-expect-error map values are numbers
    const invalid: Schema = {map: {count: 'one'}};`)
})

test('index signatures require explicit additionalProperties true or a schema', () => {
  const properties = {id: {type: 'string'}}
  const implicit = createSchemaTypescript({type: 'object', properties}, {}, 'Implicit').code
  const closed = createSchemaTypescript({type: 'object', properties, additionalProperties: false}, {}, 'Closed').code
  const open = createSchemaTypescript({type: 'object', properties, additionalProperties: true}, {}, 'Open').code
  const typed = createSchemaTypescript({type: 'object', properties, additionalProperties: {type: 'string'}}, {}, 'Typed').code
  checkTypes([implicit, closed, open, typed].join('\n'), `
    const open: Open = {id: '1', extra: true};
    const typed: Typed = {id: '1', extra: 'value'};
    // @ts-expect-error implicit objects retain excess-property checks
    const implicit: Implicit = {id: '1', extra: true};
    // @ts-expect-error explicit false retains excess-property checks
    const closed: Closed = {id: '1', extra: true};
    // @ts-expect-error explicit map values retain their declared type
    const invalid: Typed = {extra: 1};
    const key: keyof Implicit = 'id';
    // @ts-expect-error keyof implicit objects contains only known properties
    const unknownKey: keyof Implicit = 'extra';`)
  assert.equal(createSchemaTypescript({type: 'object'}, {}).code, 'export type Schema = object;')
  assert.match(createSchemaTypescript({type: 'object', additionalProperties: true}, {}).code, /\[key: string\]: unknown/)
})

test('resolves escaped pointers and aliases with version-aware siblings', () => {
  const components = {schemas: {'A/B~C': {type: 'string'}, Alias: {$ref: '#/components/schemas/A~1B~0C'}}}
  const schema = {$ref: '#/components/schemas/Alias', enum: ['fixed']}
  const old = createSchemaTypescript(schema, {openapi: '3.0.3', components}).code
  const modern = createSchemaTypescript(schema, {openapi: '3.1.0', components}).code
  assert.equal(old, 'export type Schema = string;')
  assert.match(modern, /"fixed" & Alias/)
  assert.match(modern, /export type Alias = string;/)
  checkTypes(modern)
})

test('object compositions preserve inherited and local constraints', () => {
  const document = {components: {schemas: {
    AudiobookBase: {type: 'object', properties: {id: {type: 'string'}}},
    PagingSimplifiedChapterObject: {type: 'object', allOf: [
      {$ref: '#/components/schemas/PagingObject'},
      {type: 'object', properties: {items: {type: 'array', items: {type: 'string'}}}},
    ]},
    PagingObject: {type: 'object', properties: {total: {type: 'integer'}}},
    MaybeObject: {type: ['object', 'null']},
    Unknown: {},
  }}}
  const schema = {allOf: [{$ref: '#/components/schemas/AudiobookBase'}, {
    type: 'object', required: ['chapters'], properties: {
      chapters: {type: 'object', allOf: [{$ref: '#/components/schemas/PagingSimplifiedChapterObject'}]},
      nullable: {type: 'object', allOf: [{$ref: '#/components/schemas/MaybeObject'}]},
      unknown: {type: 'object', allOf: [{$ref: '#/components/schemas/Unknown'}]},
      constrained: {type: 'object', required: ['extra'], properties: {extra: {type: 'string'}}, allOf: [{$ref: '#/components/schemas/PagingObject'}]},
    },
  }]}
  const {code} = createSchemaTypescript(schema, document, 'AudiobookObject')
  assert.match(code, /chapters: PagingSimplifiedChapterObject;/)
  assert.match(code, /nullable\?: NonNullable<MaybeObject>;/)
  assert.match(code, /unknown\?: object & Unknown;/)
  assert.match(code, /extra: string;/)
  checkTypes(code, `const valid: AudiobookObject = {chapters: {total: 1, items: ['chapter']}};
    // @ts-expect-error nullable reference retains the outer object constraint
    const invalid: AudiobookObject = {chapters: {}, nullable: null};
    // @ts-expect-error sibling properties remain required
    const constrained: AudiobookObject = {chapters: {}, constrained: {total: 1}};`)
})

test('description-only allOf members preserve schema constraints', () => {
  const document = {components: {schemas: {
    'User--Mini': {type: 'object', required: ['id'], properties: {id: {type: 'string'}}},
    'Group--Mini': {type: 'object', properties: {name: {type: 'string'}}},
  }}}
  const {code} = createSchemaTypescript({properties: {
    user: {allOf: [{$ref: '#/components/schemas/User--Mini'}, {description: 'The user that the membership applies to.'}]},
    group: {allOf: [{description: 'The group.'}, {$ref: '#/components/schemas/Group--Mini'}]},
    nested: {allOf: [{type: 'string'}, {allOf: [{}, {description: 'Only documentation.'}]}]},
    unconstrained: {allOf: [{}, {description: 'Only documentation.'}]},
    empty: {enum: [], allOf: [{}]},
    union: {anyOf: [{type: 'string'}, {}]},
  }}, document, 'GroupMembership')
  assert.match(code, /user\?: User__Mini;/)
  assert.match(code, /group\?: Group__Mini;/)
  assert.match(code, /nested\?: string;/)
  assert.match(code, /unconstrained\?: unknown;/)
  assert.match(code, /empty\?: never;/)
  assert.match(code, /union\?: unknown;/)
  checkTypes(code, `const valid: GroupMembership = {user: {id: '1'}, group: {name: 'team'}, unconstrained: false, union: 42};
    // @ts-expect-error removing unknown intersections keeps referenced constraints
    const invalid: GroupMembership = {user: {id: 1}};
    // @ts-expect-error nested allOf keeps its string constraint
    const nested: GroupMembership = {nested: 42};`)
})

test('recursive and mutually recursive schemas produce standalone compilable declarations', () => {
  const document = {components: {schemas: {
    Node: {properties: {child: {$ref: '#/components/schemas/Node'}, pair: {$ref: '#/components/schemas/Pair'}}},
    Pair: {properties: {next: {$ref: '#/components/schemas/Pair'}, owner: {$ref: '#/components/schemas/Node'}}},
  }}}
  const before = JSON.stringify(document)
  const {code, issues} = createSchemaTypescript({$ref: '#/components/schemas/Node'}, document, 'Node')
  assert.deepEqual(issues, [])
  assert.match(code, /child\?: Node;/)
  assert.match(code, /pair\?: Pair;/)
  assert.match(code, /export type Pair/)
  checkTypes(code, 'const node: Node = {child: {pair: {owner: {}}}};')
  assert.equal(JSON.stringify(document), before)
})

test('missing, external and circular reference aliases suppress incomplete output', () => {
  for (const reference of ['#/components/schemas/Missing', 'other.json#/Schema', '#/components/schemas/Loop']) {
    const result = createSchemaTypescript({properties: {nested: {$ref: reference}}}, {
      components: {schemas: {Loop: {$ref: '#/components/schemas/Loop'}}},
    })
    assert.equal(result.code, '')
    assert.equal(result.issues.length, 1)
  }
})

test('referenced schemas use named declarations, with each dependency emitted once', () => {
  const document = {components: {schemas: {
    JobResource: {type: 'object', required: ['id', 'status'], properties: {
      id: {type: 'string'}, status: {$ref: '#/components/schemas/JobStatus'},
      previousStatus: {$ref: '#/components/schemas/JobStatus'},
      history: {type: 'array', items: {$ref: '#/components/schemas/JobStatus'}},
      metadata: {type: 'object', additionalProperties: {$ref: '#/components/schemas/JobMetadata'}},
    }},
    JobStatus: {type: 'string', enum: ['queued', 'started', 'delivered', 'creation_failed', 'delivery_failed']},
    JobMetadata: {allOf: [{$ref: '#/components/schemas/MetadataBase'}]},
    MetadataBase: {properties: {attempts: {type: 'integer'}}},
    Unused: {type: 'string'},
  }}}
  const before = JSON.stringify(document)
  const {code} = createSchemaTypescript(document.components.schemas.JobResource, document, 'JobResource')
  assert.match(code, /status: JobStatus;/)
  assert.match(code, /previousStatus\?: JobStatus;/)
  assert.match(code, /history\?: JobStatus\[\];/)
  assert.match(code, /\[key: string\]: JobMetadata;/)
  assert.match(code, /export type JobMetadata = MetadataBase;/)
  assert.match(code, /export type JobStatus = "queued" \| "started" \| "delivered" \| "creation_failed" \| "delivery_failed";/)
  assert.equal((code.match(/export type JobStatus/g) ?? []).length, 1)
  assert.doesNotMatch(code, /Unused/)
  assert.equal(JSON.stringify(document), before)
  checkTypes(code, `const job: JobResource = {id: '123', status: 'queued'};
    // @ts-expect-error referenced enums keep their restrictions
    const invalid: JobResource = {id: '123', status: 'unknown'};`)
})

test('referenced names decode pointer tokens and avoid sanitized name collisions', () => {
  const document = {components: {schemas: {
    'A/B': {type: 'string'}, 'A-B': {type: 'number'},
  }}}
  const {code} = createSchemaTypescript({properties: {
    text: {$ref: '#/components/schemas/A~1B'}, count: {$ref: '#/components/schemas/A-B'},
  }}, document, 'A_B')
  assert.match(code, /text\?: A_B_1;/)
  assert.match(code, /count\?: A_B_2;/)
  assert.match(code, /export type A_B_1 = string;/)
  assert.match(code, /export type A_B_2 = number;/)
  checkTypes(code)
})

test('arrays retain union, intersection and tuple item types', () => {
  const document = {components: {schemas: {ImageObject: {
    type: 'object', properties: {url: {type: 'string'}}, additionalProperties: false,
  }}}}
  const {code} = createSchemaTypescript({properties: {
    images: {type: 'array', items: {$ref: '#/components/schemas/ImageObject'}},
    strings: {type: 'array', items: {type: 'string'}},
    unknown: {type: 'array'},
    matrix: {type: 'array', items: {type: 'array', items: {type: 'number'}}},
    union: {type: 'array', items: {type: ['string', 'number']}},
    nullable: {type: 'array', items: {type: 'string', nullable: true}},
    intersection: {type: 'array', items: {allOf: [
      {properties: {id: {type: 'string'}}, additionalProperties: false},
      {properties: {name: {type: 'string'}}, additionalProperties: false},
    ]}},
    tuple: {type: 'array', minItems: 1, prefixItems: [{type: 'number'}], items: {$ref: '#/components/schemas/ImageObject'}},
  }}, document, 'Images')
  checkTypes(code, `const valid: Images = {images: [{url: 'image.png'}], strings: ['one'], unknown: [false, {}], matrix: [[1]], union: ['text', 1], nullable: [null], intersection: [{id: '1', name: 'image'}], tuple: [1, {url: 'image.png'}]};
    // @ts-expect-error every union item is a string or number
    const union: Images = {union: [true]};
    // @ts-expect-error every intersection item must satisfy both branches
    const intersection: Images = {intersection: [false]};`)
})

test('recursive arrays and map values compile without generic circular aliases', () => {
  const document = {components: {schemas: {
    Map: {type: 'object', additionalProperties: {$ref: '#/components/schemas/Map'}},
    Array: {type: 'array', items: {$ref: '#/components/schemas/Array'}},
  }}}
  for (const name of ['Map', 'Array']) {
    const {code} = createSchemaTypescript({$ref: `#/components/schemas/${name}`}, document, name)
    checkTypes(code)
  }
})

test('nullable enums preserve null and reject unsupported literals', () => {
  const {code} = createSchemaTypescript({properties: {
    conclusion: {type: 'string', nullable: true, enum: ['success', 'failure', null]},
    quoted: {type: 'string', nullable: true, enum: ['a | b', 'quote"\\|value', null]},
    nested: {anyOf: [{oneOf: [{type: 'string'}, {type: 'null'}]}, {type: 'number'}, {type: 'null'}]},
    emptyBranch: {anyOf: [{enum: []}, {type: 'string'}]},
  }}, {}, 'NullableEnums')
  checkTypes(code, `const value: NullableEnums = {conclusion: null, quoted: 'a | b', nested: 1, emptyBranch: 'string'};
    // @ts-expect-error narrowing still rejects unsupported literals
    const invalid: NullableEnums = {conclusion: 'unknown'};`)
})

test('object unions exclude null while referenced nullable schemas retain it', () => {
  const document = {components: {schemas: {
    File: {type: 'object', nullable: true, required: ['id'], properties: {id: {type: 'string'}}},
    Folder: {type: 'object', required: ['name'], properties: {name: {type: 'string'}}},
  }}}
  const {code} = createSchemaTypescript({type: 'object', oneOf: [
    {$ref: '#/components/schemas/File'}, {$ref: '#/components/schemas/Folder'},
  ]}, document, 'AssociatedItem')
  checkTypes(code, `const file: AssociatedItem = {id: '1'};
    const folder: AssociatedItem = {name: 'folder'};
    const nullableFile: File = null;
    // @ts-expect-error the enclosing object restriction still excludes null
    const invalid: AssociatedItem = null;`)
  const mixed = createSchemaTypescript({type: 'object', oneOf: [{type: 'string'}, {$ref: '#/components/schemas/File'}]}, document, 'Mixed')
  assert.match(mixed.code, /object & \(string \| File\)/)
  checkTypes(mixed.code)
})

test('shared named schemas validate as a graph instead of expanding exponentially', () => {
  const schemas = {Leaf: {type: 'string'}}
  let name = 'Leaf'
  for (let index = 0; index < 150; index++) {
    const reference = {$ref: `#/components/schemas/${name}`}
    name = `Layer${index}`
    schemas[name] = {properties: {left: reference, right: {...reference}}}
  }
  const {code, issues} = createSchemaTypescript(schemas[name], {components: {schemas}}, name)
  assert.deepEqual(issues, [])
  assert.equal((code.match(/export type/g) ?? []).length, 151)
  assert.ok(code.length < 20000)
  checkTypes(code)
})

test('unsupported root schemas return useful diagnostics instead of WeakMap errors', () => {
  for (const schema of [true, false, null, 'string', []]) {
    const result = createSchemaTypescript(schema, {})
    assert.equal(result.code, '')
    assert.match(result.issues[0].message, /supported Schema Object/)
  }
})

test('unrepresentable recursion and excessive nesting report an unavailable output', () => {
  const document = {components: {schemas: {Loop: {allOf: [{$ref: '#/components/schemas/Loop'}]}}}}
  assert.throws(() => createSchemaTypescript(document.components.schemas.Loop, document), /recursive composition/)
  let schema = {type: 'string'}
  for (let index = 0; index < 102; index++) schema = {type: 'array', items: schema}
  assert.throws(() => createSchemaTypescript(schema, {}), /size or depth/)
})

test('TypeScript tab renders and copies types, switches back, and disables unresolved copies', async () => {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', {url: 'https://example.com/'})
  const root = createRoot(dom.window.document.querySelector('#root'))
  let schema = {oneOf: [{type: 'string'}, {type: 'number'}]}
  const render = () => act(() => root.render(h(DocumentContext.Provider, {value: {components: {}}}, h(SchemaExamples, {schema, components: {}, name: 'Choice'}))))
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
  const originalDocument = globalThis.document
  const originalWindow = globalThis.window
  let copied
  Object.defineProperty(globalThis, 'navigator', {configurable: true, value: {clipboard: {writeText: async code => {copied = code}}}})
  globalThis.window = dom.window
  globalThis.document = dom.window.document
  globalThis.HTMLElement = dom.window.HTMLElement
  try {
    render()
    const tabNamed = label => [...dom.window.document.querySelectorAll('[role="tab"]')].find(tab => tab.textContent === label)
    const tab = tabNamed('TypeScript')
    await act(async () => tab.click())
    await nextTick()
    const code = () => dom.window.document.querySelector('[role="tabpanel"]:not([hidden]) code')
    assert.equal(code().textContent, 'export type Choice = string | number;')
    assert.equal(tab.getAttribute('aria-selected'), 'true')
    const copy = dom.window.document.querySelector('[aria-label="Copy schema example"]')
    await act(async () => copy.click())
    assert.equal(copied, code().textContent)
    await act(async () => tabNamed('Example').click())
    await nextTick()
    assert.equal(code().textContent, '"string"')
    schema = {properties: {missing: {$ref: '#/components/schemas/Missing'}}}
    render()
    await act(async () => tabNamed('TypeScript').click())
    await nextTick()
    assert.equal(code().textContent, '')
    assert.equal(copy.disabled, true)
    assert.match(dom.window.document.body.textContent, /TypeScript output is unavailable/)
  } finally {
    act(() => root.unmount())
    dom.window.close()
    if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator)
    else delete globalThis.navigator
    if (originalDocument === undefined) delete globalThis.document; else globalThis.document = originalDocument
    if (originalWindow === undefined) delete globalThis.window
    else globalThis.window = originalWindow
  }
})
