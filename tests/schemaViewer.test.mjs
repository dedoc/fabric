import assert from 'node:assert/strict'
import {after, test} from 'node:test'
import {readFile} from 'node:fs/promises'
import {createServer as createHttpServer} from 'node:http'
import {createServer} from 'vite'
import {createRenderer, createSSRApp, h, provide, ref} from 'vue'
import {renderToString} from 'vue/server-renderer'

const server = await createServer({server: {middlewareMode: true, hmr: {server: createHttpServer()}}})
after(() => server.close())
const {default: Schema} = await server.ssrLoadModule('/src/components/OpenApi/Schema.vue')
const {default: Pages} = await server.ssrLoadModule('/src/components/Layouts/Pages.vue')
const {default: ApiBrand} = await server.ssrLoadModule('/src/components/OpenApi/ApiBrand.vue')
const {parseSpecification} = await server.ssrLoadModule('/src/components/OpenApi/specification.ts')
const {documentKey} = await server.ssrLoadModule('/src/utils/symbols.ts')
const {getSchemaTypeParts} = await server.ssrLoadModule('/src/components/OpenApi/schemaTypePreview.ts')
const {useMediaType, provideMediaTypeSelections} = await server.ssrLoadModule('/src/components/OpenApi/useMediaType.ts')
const {default: RequestBody} = await server.ssrLoadModule('/src/components/OpenApi/RequestBody.vue')
const {default: ResponseContent} = await server.ssrLoadModule('/src/components/OpenApi/Partials/ResponseContent.vue')
const {default: Examples} = await server.ssrLoadModule('/src/components/OpenApi/Examples.vue')
const {default: Select} = await server.ssrLoadModule('/src/components/UI/Select.vue')
const {resolveOperationBase} = await server.ssrLoadModule('/src/components/OpenApi/servers.ts')
const {getInlineOperations, getWebhookOperations} = await server.ssrLoadModule('/src/components/OpenApi/utils.ts')
const {default: OperationDatums} = await server.ssrLoadModule('/src/components/OpenApi/Partials/OperationDatums.vue')
const {operationSecurity, resolveSecurityScheme} = await server.ssrLoadModule('/src/components/OpenApi/security.ts')
const {provideAuthCredentials, httpAuthForOperation, authorizationForOption} = await server.ssrLoadModule('/src/components/OpenApi/useAuthCredentials.ts')
const {createRequestExample, requestExampleSenders} = await server.ssrLoadModule('/src/components/OpenApi/requestExamples/index.ts')
const {basicAuthorization} = await server.ssrLoadModule('/src/components/OpenApi/requestExamples/auth.ts')
const {resolveReference} = await server.ssrLoadModule('/src/components/OpenApi/references.ts')
const {resolveExampleSchema, createSchemaExample} = await server.ssrLoadModule('/src/components/OpenApi/schemaExamples.ts')
const referenceFixture = JSON.parse(await readFile(new URL('./fixtures/local-references.json', import.meta.url), 'utf8'))

async function renderWithDocument(component, props, document) {
  return renderToString(createSSRApp({setup() {
    provide(documentKey, ref(document))
    provideMediaTypeSelections()
    return () => h(component, props)
  }}))
}

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
  const {default: Operation} = await server.ssrLoadModule('/src/components/OpenApi/Operation.vue')
  const html = await renderWithDocument(Operation, {base: 'https://api.example.com', path: '/alias', method: 'post', operation, components}, document)
  for (const pattern of [/Trace identifier/, /Remaining count/, /Local response description/, /Authorization: Basic/, /&quot;id&quot;: 7/, /&quot;id&quot;: 8/]) assert.match(html, pattern)
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
      assert.match(html, /Must match all schemas/)
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
    assert.match(html, /Recursive schema/)
    assert.doesNotMatch(html, /Circular reference alias/)
  }
})

test('bad body, response, header and named-example references stay local and disable incomplete example copies', async () => {
  const {default: RequestBody} = await server.ssrLoadModule('/src/components/OpenApi/RequestBody.vue')
  const {default: Response} = await server.ssrLoadModule('/src/components/OpenApi/Response.vue')
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

test('the selected Petstore fixture loads with its upstream logo', async () => {
  const document = parseSpecification(await readFile(new URL('../public/specs/redocly-petstore.yaml', import.meta.url), 'utf8'))
  assert.equal(document.info.title, 'Swagger Petstore')
  assert.equal(document.info['x-logo'].url, 'https://raw.githubusercontent.com/Redocly/redoc/main/demo/petstore-logo.png')
  assert.ok(Object.keys(document.paths).length)
})

test('API branding resolves spec-relative logos and contact links with accessible text', async () => {
  const html = await renderToString(createSSRApp(ApiBrand, {
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
  const render = info => renderToString(createSSRApp(ApiBrand, {info}))
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

test('saved Basic credentials respect endpoint overrides and complete authentication alternatives', () => {
  const document = {security: [{Basic: []}], components: {securitySchemes: {
    Basic: {type: 'http', scheme: 'basic'}, Key: {type: 'apiKey', in: 'header', name: 'X-Key'},
  }}}
  const credentials = {Basic: {username: 'test-key', password: ''}}
  assert.deepEqual(httpAuthForOperation({}, document, credentials).credentials, credentials.Basic)
  assert.equal(httpAuthForOperation({security: []}, document, credentials), undefined)
  assert.equal(httpAuthForOperation({security: [{Key: []}]}, document, credentials), undefined)
  assert.equal(httpAuthForOperation({security: [{Basic: [], Key: []}]}, document, credentials), undefined)
  assert.equal(authorizationForOption(httpAuthForOperation({}, document, {})), undefined)
})

test('Bearer auth selects a configured complete alternative and sends the token unchanged', () => {
  const document = {security: [{Basic: []}, {Token: []}], components: {securitySchemes: {
    Basic: {type: 'http', scheme: 'basic'}, Token: {type: 'http', scheme: 'Bearer'},
    Alias: {$ref: '#/components/securitySchemes/Token'},
  }}}
  const credentials = {Token: {token: '  test.jwt-token.value  '}}
  const option = httpAuthForOperation({}, document, credentials)
  assert.equal(option.kind, 'bearer')
  assert.equal(authorizationForOption(option), 'Bearer test.jwt-token.value')
  assert.equal(httpAuthForOperation({security: []}, document, credentials), undefined)
  assert.equal(httpAuthForOperation({security: [{Basic: [], Token: []}]}, document, credentials), undefined)
  assert.equal(authorizationForOption(httpAuthForOperation({security: [{Token: []}]}, document, {Token: {username: 'wrong-kind', password: ''}})), undefined)
  assert.equal(authorizationForOption(httpAuthForOperation({security: [{Alias: []}]}, document, {Alias: {token: 'alias-token'}})), 'Bearer alias-token')
  assert.equal(authorizationForOption(httpAuthForOperation({security: [{Token: []}]}, document, {Token: {token: '  '}})), undefined)
})

test('Bearer tokens are masked in endpoint and example chips with green locks when set', async () => {
  const document = {security: [{Token: []}], components: {securitySchemes: {Token: {type: 'http', scheme: 'bearer'}}}}
  async function render(token) {
    return renderToString(createSSRApp({setup() {
      provide(documentKey, ref(document))
      provideMediaTypeSelections()
      const credentials = provideAuthCredentials()
      if (token) credentials.value.Token = {token}
      return () => h('div', [h(OperationDatums, {operation: {}}), h(Examples, {
        base: 'https://api.example.com', path: '/files', method: 'get', operation: {}, components: document.components,
      })])
    }}))
  }
  const empty = await render()
  assert.match(empty, /Auth: Bearer/)
  assert.match(empty, /Set authentication credentials/)
  assert.match(empty, /Authorization: Bearer/)
  const configured = await render('private-demo-token')
  assert.doesNotMatch(configured, /private-demo-token/)
  assert.match(configured, /Edit authentication credentials/)
  assert.equal((configured.match(/text-green-600/g) ?? []).length, 2)
})

test('Basic credentials are Base64 encoded in Bash and Laravel examples, including Unicode and empty passwords', () => {
  const request = createRequestExample('https://api.example.com', '/files', 'post', 'application/json', {example: {id: 1}}, {})
  const username = "test'keyé"
  const password = "pass'\\word"
  const encoded = Buffer.from(`${username}:${password}`, 'utf8').toString('base64')
  request.authorization = basicAuthorization(username, password)
  assert.equal(request.authorization, `Basic ${encoded}`)
  const bash = requestExampleSenders.find(sender => sender.id === 'bash').generate(request)
  const laravel = requestExampleSenders.find(sender => sender.id === 'laravel').generate(request)
  assert.ok(bash.includes(`-H 'Authorization: Basic ${encoded}'`))
  assert.ok(laravel.includes(`withHeaders(['Authorization' => 'Basic ${encoded}'])`))
  assert.doesNotMatch(bash + laravel, /test'key|pass/)
  request.authorization = basicAuthorization('test-key', '')
  assert.equal(request.authorization, `Basic ${Buffer.from('test-key:').toString('base64')}`)
  delete request.authorization
  assert.doesNotMatch(requestExampleSenders[0].generate(request), /Authorization:/)
})

test('endpoint and example chips hide credentials, including their Base64 value, in rendered HTML', async () => {
  const document = {security: [{Basic: []}], components: {securitySchemes: {Basic: {type: 'http', scheme: 'basic'}}}}
  const html = await renderToString(createSSRApp({setup() {
    provide(documentKey, ref(document))
    provideMediaTypeSelections()
    const credentials = provideAuthCredentials()
    credentials.value.Basic = {username: 'demo-username', password: 'demo-password'}
    return () => h('div', [h(OperationDatums, {operation: {}}), h(Examples, {
      base: 'https://api.example.com', path: '/files', method: 'get', operation: {}, components: document.components,
    })])
  }}))
  const trigger = html.match(/<button[^>]*aria-haspopup="dialog"[^>]*>[\s\S]*?<\/button>/)?.[0]
  assert.ok(trigger)
  assert.match(trigger.replace(/<[^>]*>/g, ''), /Auth: Basic/)
  assert.doesNotMatch(trigger, /demo-username|demo-password/)
  assert.match(html, /<dialog[^>]*aria-label="Authentication"/)
  assert.match(html, /Edit authentication credentials/)
  assert.match(html, /Authorization: Basic/)
  assert.doesNotMatch(html, /demo-username|demo-password/)
  assert.ok(!html.includes(Buffer.from('demo-username:demo-password').toString('base64')))
})

test('authenticated request examples have a credential chip before credentials are entered', async () => {
  const html = await renderToString(createSSRApp({setup() {
    provideMediaTypeSelections()
    return () => h(Examples, {base: 'https://api.example.com', path: '/files', method: 'get',
      operation: {security: [{Basic: []}]}, components: {securitySchemes: {Basic: {type: 'http', scheme: 'basic'}}},
    })
  }}))
  assert.match(html, /Set authentication credentials/)
  assert.match(html, /Authorization: Basic/)
  assert.doesNotMatch(html, /__FABRIC_AUTH_CREDENTIALS__/)
})

test('request examples omit the credential chip when authentication entry is unsupported', async () => {
  const components = {securitySchemes: {
    Key: {type: 'apiKey', in: 'header', name: 'X-API-Key'},
    OAuth: {type: 'oauth2', flows: {}},
    OpenID: {type: 'openIdConnect', openIdConnectUrl: 'https://api.example.com/.well-known/openid-configuration'},
    Digest: {type: 'http', scheme: 'digest'},
    Basic: {type: 'http', scheme: 'basic'},
  }}
  for (const security of [[], [{Key: []}], [{OAuth: []}], [{OpenID: []}], [{Digest: []}], [{Missing: []}], [{Basic: [], Key: []}]]) {
    const html = await renderToString(createSSRApp({setup() {
      provideMediaTypeSelections()
      return () => h(Examples, {base: 'https://api.example.com', path: '/files', method: 'get',
        operation: {security}, components,
      })
    }}))
    assert.doesNotMatch(html, /Set credentials|Set authentication credentials|__FABRIC_AUTH_CREDENTIALS__/)
    assert.match(html, /curl/)
  }
})

async function renderAuthentication(operation, document) {
  return renderToString(createSSRApp({setup() {
    provide(documentKey, ref(document))
    return () => h(OperationDatums, {operation})
  }}))
}

test('Basic authentication inherits Converterer instructions without redundant cURL guidance', async () => {
  const document = {security: [{ConvertererApiKey: []}], components: {securitySchemes: {
    ConvertererApiKey: {type: 'http', scheme: 'basic', description: 'Use your Converterer API key as the username.\nLeave the password empty.'},
  }}}
  const html = await renderAuthentication({}, document)
  assert.match(html, /Basic authentication/)
  assert.match(html, /Use your Converterer API key as the username/)
  assert.match(html, /Leave the password empty/)
  assert.match(html, /Base64-encoded/)
  assert.doesNotMatch(html, /With cURL|trailing colon|--user/)
  assert.doesNotMatch(html, /Bearer/)
  const overview = await renderPages(document.components, '#overview', {document})
  assert.match(overview, /Basic authentication/)
  assert.match(overview, /Leave the password empty/)
})

test('operation authentication overrides inheritance and distinguishes public and optional access', async () => {
  const document = {security: [{Basic: []}], components: {securitySchemes: {Basic: {type: 'http', scheme: 'basic'}}}}
  assert.doesNotMatch(await renderAuthentication({security: []}, document), /No authentication required|Auth:|<dialog/)
  assert.doesNotMatch(await renderAuthentication({security: []}, document), /Basic authentication/)
  assert.doesNotMatch(await renderAuthentication({}, {}), /No authentication required|Auth:|<dialog/)
  const optional = await renderAuthentication({security: [{}, {Basic: []}]}, document)
  assert.match(optional, /Authentication is optional/)
  assert.match(optional, /Basic authentication/)
})

test('authentication alternatives, combined requirements, scopes and API key locations are explicit', async () => {
  const document = {components: {securitySchemes: {
    OAuth: {type: 'oauth2', flows: {}},
    Key: {type: 'apiKey', name: 'X-API-Key', in: 'header'},
    Token: {type: 'http', scheme: 'Bearer', bearerFormat: 'JWT'},
  }}}
  const html = await renderAuthentication({security: [{OAuth: ['files:read'], Key: []}, {Token: []}]}, document)
  assert.match(html, /Use one of the following/)
  assert.match(html, /All of these methods are required together/)
  assert.match(html, /Or — Option 2/)
  assert.match(html, /files:read/)
  assert.match(html, /X-API-Key<\/code> header/)
  assert.match(html, /Authorization: Bearer &lt;token&gt;/)
  assert.match(html, /Token format: JWT/)
  for (const location of ['query', 'cookie']) {
    const result = await renderAuthentication({security: [{Key: []}]}, {components: {securitySchemes: {
      Key: {type: 'apiKey', name: 'key', in: location},
    }}})
    assert.match(result, new RegExp(location === 'query' ? 'query parameter' : 'cookie'))
  }
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
  assert.match(html, /curl -X POST &#39;https:\/\/download.converterer\.com\/&#39;/)
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
  assert.match(html, /curl -X GET &#39;https:\/\/spec.example.com\/v2\/files&#39;/)
  assert.doesNotMatch(html, /root\.example\.com|path\.example\.com|curl -X POST/)
})

test('request curl sends URL-encoded fields for form content', async () => {
  const html = await renderToString(createSSRApp({render: () => h(Examples, {
    base: '', components: {}, path: '/pet', method: 'post', operation: {
      requestBody: {content: {'application/x-www-form-urlencoded': {example: {
        name: "dog's & cat", category: {id: 1}, photoUrls: ['one', 'two'],
      }}}}, responses: {},
    },
  })}))
  assert.match(html, /Content-Type: application\/x-www-form-urlencoded/)
  assert.match(html, /--data-urlencode &#39;name=dog&#39;\\&#39;&#39;s &amp; cat&#39;/)
  assert.match(html, /--data-urlencode &#39;category=\{&quot;id&quot;:1\}&#39;/)
  assert.match(html, /--data-urlencode &#39;photoUrls=one&#39;/)
  assert.match(html, /--data-urlencode &#39;photoUrls=two&#39;/)
  assert.doesNotMatch(html, / -d /)
})

async function renderReference(target) {
  return renderToString(createSSRApp({render: () => h(Schema, {
    schema: {$ref: '#/components/schemas/MetadataInstanceValue'},
    components: {schemas: {MetadataInstanceValue: target}},
    propertyTitle: 'value',
    level: 1,
  })}))
}

test('renders a referenced oneOf schema without a top-level type', async () => {
  const html = await renderReference({
    description: 'Metadata value.',
    example: 'reviewed',
    oneOf: [{type: 'string'}, {type: 'integer'}, {type: 'number'}, {type: 'array', items: {type: 'string'}}],
  })
  assert.match(html, /Metadata value\./)
  assert.match(html, /reviewed/)
  assert.match(html.replace(/<[^>]*>/g, ''), /string \| integer \| number \| string\[\]/)
})

test('union details distinguish matching rules and expose inline object requirements', async () => {
  const options = [
    {type: 'string', enum: ['a4', 'letter']},
    {type: 'object', required: ['width', 'height'], properties: {
      width: {type: ['string', 'number']}, height: {type: ['string', 'number']},
    }},
  ]
  for (const [keyword, rule] of [['anyOf', 'at least one'], ['oneOf', 'exactly one']]) {
    const html = await renderReference({[keyword]: options, default: 'a4'})
    assert.ok(html.includes(`Must match ${rule} option.`))
    assert.match(html, /role="group" aria-label="value options"/)
    assert.match(html, /Option 1/)
    assert.match(html, /Option 2/)
    const text = html.replace(/<[^>]*>/g, '')
    assert.match(text, /width\s*string\s*\|\s*number\s*required/)
    assert.match(text, /height\s*string\s*\|\s*number\s*required/)
    assert.match(html, /Hide options/)
  }
})

test('renders const constraints, including falsy and structured values', async () => {
  for (const value of ['Pong!', null, false, 0, '', {message: 'Pong!'}]) {
    const html = await renderReference({const: value})
    const text = html.replace(/<[^>]*>/g, '')
    assert.match(text, /Const/)
    const formatted = value === '' ? '&#39;&#39;' : typeof value === 'object' ? JSON.stringify(value) : String(value)
    assert.ok(text.replaceAll('&quot;', '"').includes(formatted))
  }
})

test('accepts other referenced schemas without a top-level type', async () => {
  for (const target of [{}, {anyOf: [{type: 'string'}, {type: 'number'}]}, {description: 'Free-form value.', example: {key: 'value'}}]) {
    const html = await renderReference(target)
    assert.match(html, /MetadataInstanceValue/)
  }
})

async function renderPages(components, hash = '', options = {}) {
  const previousWindow = globalThis.window
  globalThis.window = {location: {href: `http://localhost/${hash}`}}
  try {
    const document = {info: {title: 'API'}, components}
    return await renderToString(createSSRApp({setup() {
      provide(documentKey, ref(document))
      return () => h(Pages, {document, components, paths: {}, base: 'https://api.example.com', ...options})
    }}))
  } finally {
    if (previousWindow === undefined) delete globalThis.window
    else globalThis.window = previousWindow
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
  assert.match(html, /Your webhook URL/)
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

test('editorial is the only overview and old variant links still open it', async () => {
  for (const hash of ['#overview', '#overview/editorial', '#overview/xai']) {
    const html = await renderPages({}, hash, {
      document: {info: {title: 'Files', description: 'Manage **files**.', version: '1.0'}},
      paths: {'/files': {get: {operationId: 'list', tags: ['Files']}}},
    })
    assert.match(html, /max-w-\[72ch\]/)
    assert.match(html, /Manage <strong>files<\/strong>/)
    assert.match(html, /href="#operations\/list"/)
    assert.equal((html.match(/href="#overview"/g) ?? []).length, 1)
    assert.match(html, /href="#overview"[^>]*aria-current="page"/)
    assert.doesNotMatch(html, /Overview ·|overview--|Authenticate with/)
    assert.equal((html.match(/<h1[ >]/g) ?? []).length, 1)
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
    title: 'Person details', description: 'A person in the workspace.', type: 'object', properties: {id: {type: 'integer', example: 42}},
  }}}, '#schemas/Person%2FDetails')
  assert.match(html, /<h1[^>]*>Person details<\/h1>/)
  assert.equal((html.match(/A person in the workspace\./g) ?? []).length, 1)
  assert.match(html, /JSON schema/)
  assert.match(html, /Typescript/)
  assert.match(html, /&quot;id&quot;: 42/)
  assert.match(html, /aria-current="page"/)
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
  assert.match(enabled, /text-inherit no-underline hover:cursor-pointer hover:underline/)
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
  const html = await renderToString(createSSRApp({render: () => h(Schema, {schema, components, propertyTitle: 'included', level: 1})}))
  const text = html.replace(/<[^>]*>/g, '')
  assert.match(text, /\(ComponentGroup \| Incident\)\[\]/)
  assert.ok((text.match(/ComponentGroup/g) ?? []).length >= 2)
  assert.ok((text.match(/Incident/g) ?? []).length >= 2)
})

test('content type selection changes media and handles changing or empty content', () => {
  const json = {schema: {type: 'object'}, example: {message: 'JSON'}}
  const xml = {schema: {type: 'string'}, example: '<message>XML</message>'}
  const content = ref({'application/json': json, 'application/xml': xml})
  const selection = useMediaType(() => content.value)
  assert.equal(selection.type.value, 'application/json')
  assert.deepEqual(selection.media.value, json)
  selection.type.value = 'application/xml'
  assert.deepEqual(selection.media.value, xml)
  content.value = {'text/plain': {example: 'text'}}
  assert.equal(selection.type.value, 'text/plain')
  assert.equal(selection.media.value.example, 'text')
  content.value = {}
  assert.equal(selection.type.value, '')
  assert.equal(selection.media.value, undefined)
})

test('body views render one schema with a borderless content type picker', async () => {
  const content = {
    'application/json': {schema: {type: 'object', properties: {jsonProperty: {type: 'string'}}}},
    'application/xml': {schema: {type: 'object', properties: {xmlProperty: {type: 'string'}}}},
  }
  for (const [component, props, label] of [
    [RequestBody, {requestBody: {content}}, 'Request body content type'],
    [ResponseContent, {unreferencedResponse: {description: 'Success', content}}, 'Response body content type'],
  ]) {
    const html = await renderToString(createSSRApp({render: () => h(component, {components: {}, ...props})}))
    assert.match(html, new RegExp(`aria-label="${label}"`))
    assert.match(html, /border-0 bg-transparent/)
    assert.match(html, /title="application\/json"/)
    assert.match(html, /<option value="application\/json"/)
    assert.match(html, /<option value="application\/xml"/)
    assert.match(html, /jsonProperty/)
    assert.doesNotMatch(html, /xmlProperty/)
  }
})

test('example panels use the selected media without content type pickers', async () => {
  const content = {
    'application/json': {example: {message: 'JSON example'}},
    'application/xml': {example: '<message>XML example</message>'},
  }
  const html = await renderToString(createSSRApp({render: () => h(Examples, {
    components: {}, base: 'https://example.com', path: '/messages', method: 'post',
    operation: {requestBody: {content}, responses: {200: {description: 'Success', content}}},
  })}))
  assert.doesNotMatch(html, /aria-label="(?:Request|Response) example content type"/)
  assert.match(html, /Content-Type: application\/json/)
  assert.match(html, /JSON example/)
  assert.doesNotMatch(html, /XML example/)
})

test('response payload format follows its documentation selection independently of the request', async () => {
  const content = {
    'application/json': {example: {message: 'JSON response'}},
    'application/xml': {example: '<message>XML response</message>'},
  }
  for (const selected of Object.keys(content)) {
    const Consumer = {setup() {
      useMediaType(() => content, () => 'response:200').type.value = selected
      return () => h(Examples, {
        components: {}, base: 'https://example.com', path: '/messages', method: 'post',
        operation: {requestBody: {content}, responses: {200: {description: 'Success', content}}},
      })
    }}
    const html = await renderToString(createSSRApp({setup() {
      provideMediaTypeSelections()
      return () => h(Consumer)
    }}))
    const request = html.split('aria-label="Request example"')[1].split('</section>')[0]
    const response = html.split('aria-label="Response example"')[1].split('</section>')[0]
    assert.match(request, /Content-Type: application\/json/)
    assert.doesNotMatch(request, /XML response/)
    if (selected === 'application/xml') {
      assert.match(response, /&lt;message&gt;XML response&lt;\/message&gt;/)
      assert.doesNotMatch(response, /JSON response/)
    } else {
      assert.match(response, /&quot;message&quot;: &quot;JSON response&quot;/)
      assert.doesNotMatch(response, /XML response/)
    }
  }
})

test('documentation and examples share selections separately for requests and each response status', async () => {
  const content = {'application/json': {example: 'JSON'}, 'application/xml': {example: 'XML'}}
  const status = ref('200')
  let selections
  const Consumer = {setup() {
    selections = {
      requestDocs: useMediaType(() => content, () => 'request'),
      requestExample: useMediaType(() => content, () => 'request'),
      successDocs: useMediaType(() => content, () => 'response:200'),
      errorDocs: useMediaType(() => content, () => 'response:400'),
      responseExample: useMediaType(() => content, () => `response:${status.value}`),
    }
    return () => h('div')
  }}
  const renderer = createRenderer({
    createElement: () => ({}), createText: () => ({}), createComment: () => ({}),
    insert() {}, remove() {}, setText() {}, setElementText() {}, patchProp() {},
    parentNode: () => null, nextSibling: () => null,
  })
  const app = renderer.createApp({setup() {
    provideMediaTypeSelections()
    return () => h(Consumer)
  }})
  app.mount({})
  selections.requestDocs.type.value = 'application/xml'
  assert.equal(selections.requestExample.media.value.example, 'XML')
  assert.equal(selections.responseExample.media.value.example, 'JSON')
  selections.successDocs.type.value = 'application/xml'
  assert.equal(selections.responseExample.media.value.example, 'XML')
  status.value = '400'
  assert.equal(selections.responseExample.media.value.example, 'JSON')
  status.value = '200'
  assert.equal(selections.responseExample.media.value.example, 'XML')
  app.unmount()
})

test('a single select option renders plain text without a dropdown or chevron', async () => {
  const html = await renderToString(createSSRApp({render: () => h(Select, {
    modelValue: 'application/json', options: [{value: 'application/json', label: 'application/json'}],
    class: 'text-gray-500', 'aria-label': 'Content type',
  })}))
  assert.match(html, /application\/json/)
  assert.match(html, /text-gray-500/)
  assert.doesNotMatch(html, /<select|<svg/)
})

test('request curl and response examples serialize selected XML schemas', async () => {
  const components = {schemas: {Pet: {type: 'object', xml: {name: 'pet'}, properties: {
    id: {type: 'integer', example: 7, xml: {attribute: true}},
    name: {type: 'string', example: 'doggie'},
  }}}}
  const content = {'application/xml': {schema: {$ref: '#/components/schemas/Pet'}}}
  const html = await renderToString(createSSRApp({render: () => h(Examples, {
    components, base: 'https://example.com', path: '/pets', method: 'post',
    operation: {requestBody: {content}, responses: {200: {description: 'Success', content}}},
  })}))
  assert.match(html, /Content-Type: application\/xml/)
  assert.match(html, /Bash/)
  assert.match(html, /aria-label="Request example sender"/)
  assert.match(html, /<option value="laravel">Laravel<\/option>/)
  assert.match(html, /<option value="payload">XML<\/option>/)
  assert.doesNotMatch(html, /<option value="payload">JSON<\/option>/)
  assert.equal((html.match(/&lt;pet id=&quot;7&quot;&gt;/g) ?? []).length, 2)
  assert.equal((html.match(/&lt;name&gt;doggie&lt;\/name&gt;/g) ?? []).length, 2)
})

test('request curl includes a generated JSON payload when no explicit example exists', async () => {
  const content = {'application/json': {schema: {type: 'object', properties: {
    name: {type: 'string', default: 'doggie'}, enabled: {type: 'boolean'},
  }}}}
  const html = await renderToString(createSSRApp({render: () => h(Examples, {
    components: {}, base: 'https://example.com', path: '/pets', method: 'post',
    operation: {requestBody: {content}},
  })}))
  assert.match(html, /Content-Type: application\/json/)
  assert.match(html, /-d &#39;\{/)
  assert.match(html, /&quot;name&quot;: &quot;doggie&quot;/)
  assert.match(html, /&quot;enabled&quot;: true/)
})

test('request picker offers only the payload format matching the selected content type', async () => {
  for (const [type, label] of [
    ['application/json', 'JSON'], ['Application/Problem+JSON; charset=utf-8', 'JSON'],
    ['text/json', 'JSON'], ['application/xml', 'XML'], ['application/problem+xml', 'XML'],
    ['text/xml; charset=utf-8', 'XML'], ['application/x-www-form-urlencoded', null],
    ['multipart/form-data', null], ['', null],
  ]) {
    const html = await renderToString(createSSRApp({render: () => h(Examples, {
      components: {}, base: 'https://example.com', path: '/pets', method: 'post',
      operation: {requestBody: type ? {content: {[type]: {example: {name: 'doggie'}}}} : undefined},
    })}))
    assert.match(html, /<option value="bash"[^>]*>Bash<\/option>/)
    assert.match(html, /<option value="laravel">Laravel<\/option>/)
    if (label) {
      assert.ok(html.includes(`<option value="payload">${label}</option>`))
      assert.ok(!html.includes(`<option value="payload">${label === 'JSON' ? 'XML' : 'JSON'}</option>`))
    } else assert.doesNotMatch(html, /<option value="payload">/)
  }
})
