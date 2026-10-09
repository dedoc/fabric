import assert from 'node:assert/strict'
import {test, after} from 'node:test'
import {createServer} from 'vite'
const server = await createServer({server: {middlewareMode: true, hmr: false}, appType: 'custom'})
after(() => server.close())
const {createRequestExample, requestExampleSenders} = await server.ssrLoadModule('/src/components/OpenApi/requestExamples/index.ts')
const {createSchemaExample} = await server.ssrLoadModule('/src/components/OpenApi/schemaExamples.ts')
const {selectMediaExample, formatMediaExample} = await server.ssrLoadModule('/src/components/OpenApi/mediaExamples.ts')

test('binary requests use a shared file placeholder in Bash and Laravel', () => {
  const model = createRequestExample('https://example.com', '/uploads', 'post', 'application/pdf', {schema: {type: 'string', format: 'binary'}}, {})
  assert.equal(model.bodyFile, 'example.pdf')
  assert.match(requestExampleSenders[0].generate(model), /--data-binary '@example.pdf'/)
  assert.match(requestExampleSenders[1].generate(model), /withBody\(file_get_contents\('example.pdf'\), 'application\/pdf'\)/)
  assert.equal(createRequestExample('', '/', 'post', 'application/octet-stream', {}, {}).bodyFile, 'example.bin')
})

test('multipart binary references become file attachments alongside literal text fields', () => {
  const components = {schemas: {File: {type: 'string', format: 'binary'}}}
  const media = {schema: {type: 'object', properties: {file: {$ref: '#/components/schemas/File'}, caption: {type: 'string', example: '@literal'}, serverFile: {type: 'string', format: 'binary', readOnly: true}}}, encoding: {file: {contentType: 'application/pdf'}}}
  const model = createRequestExample('', '/uploads', 'post', 'multipart/form-data', media, components)
  assert.deepEqual(model.formFiles, [['file', 'example.pdf']])
  assert.deepEqual(model.formFields, [['caption', '@literal']])
  assert.match(requestExampleSenders[0].generate(model), /--form 'file=@example.pdf'/)
  assert.match(requestExampleSenders[0].generate(model), /--form-string 'caption=@literal'/)
  assert.doesNotMatch(requestExampleSenders[0].generate(model), /Content-Type|serverFile/)
  assert.match(requestExampleSenders[1].generate(model), /attach\('file', fopen\('example.pdf', 'r'\), 'example.pdf'\)/)
  const supplied = createRequestExample('', '/uploads', 'post', 'multipart/form-data', {...media, example: {file: 'supplied bytes', caption: '@literal', serverFile: 'private bytes'}}, components)
  assert.deepEqual(supplied.formFields, [['caption', '@literal']])
  const multiple = createRequestExample('', '/uploads', 'post', 'multipart/form-data', {schema: {type: 'object', properties: {files: {type: 'array', minItems: 2, items: {$ref: '#/components/schemas/File'}}}}}, components)
  assert.deepEqual(multiple.formFiles, [['files', 'example-1.bin'], ['files', 'example-2.bin']])
})

test('encoded effective parameters feed both senders, including cookies and JSON content', () => {
  const parameters = [
    {in: 'path', name: 'id', required: true, example: 'design/review ?#'},
    {in: 'query', name: 'tags', example: ['a/b', 'c&d']},
    {in: 'query', name: 'filter', content: {'application/json': {example: {status: 'active'}}}},
    {in: 'query', name: 'fields', explode: false, example: ['name', 'status']},
    {in: 'query', name: 'page', example: 0},
    {in: 'header', name: 'X-Region', example: 'eu'},
    {in: 'cookie', name: 'session', example: 'a;b'},
  ]
  const request = createRequestExample('https://example.com', '/projects/{id}', 'get', '', undefined, {}, {}, parameters)
  assert.equal(request.url, 'https://example.com/projects/design%2Freview%20%3F%23?tags=a%2Fb&tags=c%26d&filter=%7B%22status%22%3A%22active%22%7D&fields=name,status&page=0')
  assert.deepEqual(request.headers, [['X-Region', 'eu'], ['Cookie', 'session=a%3Bb']])
  for (const sender of requestExampleSenders) {
    request.authorization = 'Bearer saved-token'
    const code = sender.generate(request)
    for (const value of [request.url, 'X-Region', 'eu', 'session=a%3Bb', 'Bearer saved-token']) assert.ok(code.includes(value), code)
  }
})

test('styles preserve punctuation while encoding data and reject unsupported nested shapes', () => {
  assert.equal(createRequestExample('', '/', 'get', '', undefined, {}, {}, [{in: 'query', name: 'word', content: {'application/json': {example: 'a/b'}}}]).url, '/?word=%22a%2Fb%22')
  for (const [style, explode, expected] of [['simple', false, 'a%2Fb,c'], ['label', true, '.a%2Fb.c'], ['matrix', true, ';id=a%2Fb;id=c']]) {
    const model = createRequestExample('', '/{id}', 'get', '', undefined, {}, {}, [{in: 'path', name: 'id', style, explode, example: ['a/b', 'c']}])
    assert.equal(model.url, '/' + expected)
  }
  assert.throws(() => createRequestExample('', '/{id}', 'get', '', undefined, {}), /path parameter/)
  for (const [style, value, explode, expected] of [
    ['deepObject', {name: 'a/b', enabled: false}, true, 'filter%5Bname%5D=a%2Fb&filter%5Benabled%5D=false'],
    ['spaceDelimited', ['a/b', 'c'], false, 'filter=a%2Fb%20c'],
    ['pipeDelimited', ['a|b', 'c'], false, 'filter=a%7Cb|c'],
  ]) assert.equal(createRequestExample('', '/', 'get', '', undefined, {}, {}, [{in: 'query', name: 'filter', style, explode, example: value}]).url, '/?' + expected)
  assert.throws(() => createRequestExample('', '/', 'get', '', undefined, {}, {}, [{in: 'query', name: 'filter', style: 'deepObject', example: {nested: {a: 1}}}]), /Nested/)
})

test('Stripe expand deepObject arrays produce bracketed query names for both senders', () => {
  const parameter = {in: 'query', name: 'expand', required: false, style: 'deepObject', explode: true,
    schema: {type: 'array', items: {type: 'string', maxLength: 5000}},
  }
  const generated = createRequestExample('https://api.stripe.com', '/v1/account', 'get', '', undefined, {}, {}, [parameter])
  assert.equal(generated.url, 'https://api.stripe.com/v1/account?expand%5B%5D=string')
  const model = createRequestExample('https://api.stripe.com', '/v1/account', 'get', '', undefined, {}, {}, [
    {...parameter, example: ['customer', 'payment_intent.customer', 'a&b=c/#']},
  ])
  assert.equal(model.url, 'https://api.stripe.com/v1/account?expand%5B%5D=customer&expand%5B%5D=payment_intent.customer&expand%5B%5D=a%26b%3Dc%2F%23')
  for (const sender of requestExampleSenders) {
    assert.ok(sender.generate(generated).includes(generated.url))
    assert.ok(sender.generate(model).includes(model.url))
  }
  assert.equal(createRequestExample('', '/', 'get', '', undefined, {}, {}, [{...parameter, example: []}]).url, '/')
  assert.throws(() => createRequestExample('', '/', 'get', '', undefined, {}, {}, [{...parameter, example: [{nested: 'value'}]}]), /Nested/)
  assert.throws(() => createRequestExample('', '/', 'get', '', undefined, {}, {}, [{...parameter, example: 'customer'}]), /flat object or array/)
})

test('Stripe expand form arrays retain bracketed names and encoded values in both senders', () => {
  const media = {example: {expand: ['customer', 'payment_intent.customer', 'a&b=c/#']},
    encoding: {expand: {style: 'deepObject', explode: true}},
  }
  const model = createRequestExample('https://api.stripe.com', '/v1/customers', 'post', 'application/x-www-form-urlencoded', media, {})
  assert.deepEqual(model.formFields, [['expand[]', 'customer'], ['expand[]', 'payment_intent.customer'], ['expand[]', 'a&b=c/#']])
  assert.match(requestExampleSenders[0].generate(model), /--data-urlencode 'expand%5B%5D=customer'/)
  assert.match(requestExampleSenders[1].generate(model), /expand%5B%5D=customer&expand%5B%5D=payment_intent.customer&expand%5B%5D=a%26b%3Dc%2F%23/)
})

test('generated constraints retain zero, strict bounds, lengths, counts and uniqueness', () => {
  assert.equal(createSchemaExample({type: 'integer', minimum: 0, exclusiveMinimum: true, maximum: 2}), 1)
  assert.equal(createSchemaExample({type: 'number', exclusiveMinimum: 0, exclusiveMaximum: 1}), .5)
  assert.equal(createSchemaExample({allOf: [{type: 'integer', minimum: 5}, {type: 'integer', maximum: 10}]}), 5)
  assert.throws(() => createSchemaExample({allOf: [{type: 'integer', minimum: 5}, {type: 'integer', maximum: 3}]}), /allOf constraints/)
  assert.equal(createSchemaExample({type: 'string', minLength: 8, maxLength: 8}).length, 8)
  assert.deepEqual(createSchemaExample({type: 'array', maxItems: 0, items: {type: 'string'}}), [])
  assert.deepEqual(createSchemaExample({type: 'array', minItems: 2, uniqueItems: true, items: {enum: ['a', 'b']}}), ['a', 'b'])
  for (const schema of [{type: 'integer', exclusiveMinimum: 0, exclusiveMaximum: 1}, {type: 'string', pattern: '^(?=a)a$'}, {type: 'array', minItems: 2, uniqueItems: true, items: {const: 'a'}}]) assert.throws(() => createSchemaExample(schema), /Supply|supplied/)
})

test('Converterer bitrate and hex color patterns produce matching request values', () => {
  const properties = {
    bitrate_video: {type: 'string', pattern: '^[\\d.]+[kM]?$'},
    bitrate_audio: {type: 'string', pattern: '^[\\d.]+[kM]?$'},
    background_color: {type: 'string', pattern: '^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$'},
  }
  const media = {schema: {type: 'object', properties: {options: {type: 'object', properties}}}}
  const model = createRequestExample('', '/convert', 'post', 'application/json', media, {})
  for (const [name, schema] of Object.entries(properties)) assert.match(model.value.options[name], new RegExp(schema.pattern))
  for (const sender of requestExampleSenders) assert.ok(sender.generate(model).includes('background_color'))
})

test('unsupported optional fields are omitted while required fields still disclose failure', () => {
  const schema = {type: 'object', properties: {name: {type: 'string'}, advanced: {type: 'string', pattern: '^(?=a)a$'}}}
  assert.deepEqual(createSchemaExample(schema), {name: 'string'})
  assert.throws(() => createSchemaExample({...schema, required: ['advanced']}), /Cannot generate this pattern/)
  assert.equal(createSchemaExample({type: 'string', pattern: '^[a-z]{3}$'}), 'aaa')
  assert.equal(createSchemaExample({type: 'string', pattern: '^a\\.b$'}), 'a.b')
  assert.equal(createSchemaExample({type: 'string', pattern: '^a{0}$'}), '')
  assert.throws(() => createSchemaExample({type: 'string', pattern: '^a{999999}$'}), /Cannot generate/)
})

test('media selection preserves falsy values, descriptions, direction and raw text', () => {
  const media = {schema: {type: 'object', properties: {id: {type: 'string', readOnly: true}, secret: {type: 'string', writeOnly: true}}}, examples: {first: {value: {id: '1', secret: 's'}}, empty: {description: 'An empty value', value: ''}, zero: {value: 0}}}
  assert.deepEqual(selectMediaExample(media, 'empty', {}).media.example, '')
  assert.equal(selectMediaExample(media, 'empty', {}).description, 'An empty value')
  assert.equal(selectMediaExample(media, 'zero', {}).media.example, 0)
  assert.equal(formatMediaExample(media, 'application/json', {}, true, {}, undefined, 'request'), '{\n  "secret": "s"\n}')
  assert.equal(formatMediaExample(media, 'application/json', {}, true, {}, undefined, 'response'), '{\n  "id": "1"\n}')
  assert.equal(formatMediaExample({example: 'hello\nworld'}, 'text/plain', {}), 'hello\nworld')
  const raw = createRequestExample('', '/', 'post', 'text/plain', {example: '@local-file'}, {})
  assert.match(requestExampleSenders[0].generate(raw), /--data-raw '@local-file'/)
  assert.throws(() => formatMediaExample({example: 'bytes'}, 'application/octet-stream', {}), /Cannot serialize/)
  assert.throws(() => formatMediaExample({schema: {type: 'object', properties: {file: {type: 'string', format: 'binary'}}}, example: {file: 'fake bytes'}}, 'multipart/form-data', {}), /Binary/)
  assert.throws(() => selectMediaExample({examples: {external: {externalValue: 'https://example.com'}}}, 'external', {}), /External/)
})
