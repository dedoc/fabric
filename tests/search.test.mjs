import assert from 'node:assert/strict'
import {after, test} from 'node:test'
import {createServer as createHttpServer} from 'node:http'
import {createServer} from 'vite'

const server = await createServer({server: {middlewareMode: true, hmr: {server: createHttpServer()}}})
after(() => server.close())
const {buildSearchEntries, createSearchIndex, searchEntries} = await server.ssrLoadModule('/src/core/search.ts')
const {getInlineOperations, getWebhookOperations} = await server.ssrLoadModule('/src/core/openapi/utils.ts')
const {parseGuides} = await server.ssrLoadModule('/src/core/guides.ts')
const document = {
  openapi: '3.2.0', info: {title: 'Pet API', description: 'Welcome to the catalog'},
  tags: [{name: 'pets', summary: 'Companions', parent: 'catalog'}, {name: 'catalog', summary: 'Animal catalog'}],
  paths: {'/pets': {get: {summary: 'List pets', operationId: 'listPets', description: 'Find adoptable animals', tags: ['pets'], responses: {}}}},
  webhooks: {created: {post: {summary: 'Pet created', responses: {}}}},
  components: {schemas: {'Pet record': {title: 'Pet profile', description: 'An animal', properties: {microchip: {type: 'string'}}}}},
}
const guides = parseGuides({auth: '---\ntitle: Authentication\n---\nUse a bearer token to authorize.'})
const entries = buildSearchEntries(document, getInlineOperations(document.paths), getWebhookOperations(document), guides, true)
const search = query => searchEntries(createSearchIndex(entries), query)

test('fuzzy titles and operation metadata navigate to the operation ID', () => {
  for (const query of ['list ptes', '/pets', 'listPets', 'adoptable', 'Companions', 'Animal catalog', 'GET']) {
    assert.ok(search(query).some(item => item.id === 'operations/listPets'), query)
  }
})

test('search includes guide content, webhooks, schema properties and overview', () => {
  assert.equal(search('bearer token')[0].id, 'guides/auth')
  assert.equal(search('Pet created')[0].id, 'webhooks/created/post')
  assert.equal(search('microchip')[0].id, 'schemas/Pet%20record')
  assert.ok(search('Welcome').some(item => item.id === 'overview'))
  assert.equal(search('zzzzzzzzzzzz').length, 0)
  assert.equal(new Set(entries.map(entry => entry.id)).size, entries.length)
})

test('disabled schemas are excluded and legacy tag groups remain searchable', () => {
  for (const openapi of ['3.0.3', '3.1.0', '3.2.0', '3.2.1']) {
    const spec = {...document, openapi, 'x-tagGroups': [{name: 'Partner endpoints', tags: ['pets']}]}
    const limited = buildSearchEntries(spec, getInlineOperations(document.paths), [], [], false)
    assert.ok(limited.every(item => item.kind !== 'Schema'))
    const index = createSearchIndex(limited)
    assert.equal(index.search('Partner endpoints').length, openapi.startsWith('3.2.') ? 0 : 1)
    for (const query of ['Companions', 'Animal catalog']) {
      assert.equal(index.search(query)[0].item.id, 'operations/listPets')
    }
  }
})

test('tag parent cycles terminate and rebuilding the index replaces old results', () => {
  const cyclic = {...document, tags: [{name: 'pets', parent: 'pets'}]}
  assert.doesNotThrow(() => buildSearchEntries(cyclic, getInlineOperations(document.paths), [], [], false))
  assert.equal(createSearchIndex([]).search('List pets').length, 0)
})

test('complete title matches outrank partial matches with short descriptions', () => {
  const fixtures = [
    {id: 'outbound-payment', title: 'Create an OutboundPayment', kind: 'Operation', detail: '/v1/treasury/outbound_payments', content: 'PostTreasuryOutboundPayments <p>Creates an OutboundPayment.</p>'},
    {id: 'outbound-transfer', title: 'Create an OutboundTransfer', kind: 'Operation', detail: '/v1/treasury/outbound_transfers', content: 'PostTreasuryOutboundTransfers <p>Creates an OutboundTransfer.</p>'},
    {id: 'account', title: 'Create an account', kind: 'Operation', detail: '/v1/accounts', content: 'PostAccounts With Connect, you can create Stripe accounts for your users. Register your platform to begin managing connected accounts. '.repeat(10)},
  ]
  const index = createSearchIndex(fixtures)
  assert.notEqual(index.search('create account')[0].item.id, 'account')
  assert.equal(searchEntries(index, 'create account')[0].id, 'account')
  assert.equal(searchEntries(index, '  CREATE ACCOUNT  ')[0].id, 'account')
  assert.ok(searchEntries(index, 'create acount').some(item => item.id === 'account'))
})

test('title prioritization runs before truncating the result list', () => {
  const fixtures = Array.from({length: 60}, (_, i) => ({
    id: `description-${i}`, title: `Other ${i}`, kind: 'Guide', detail: '', content: 'create account',
  }))
  fixtures.push({id: 'account', title: 'Create an account', kind: 'Guide', detail: '', content: ''})
  const results = searchEntries(createSearchIndex(fixtures), 'create account')
  assert.equal(results.length, 50)
  assert.equal(results[0].id, 'account')
})

test('background search returns request IDs and replaces its index when the spec changes', async () => {
  const originalSelf = globalThis.self
  const messages = []
  const worker = {postMessage: message => messages.push(message)}
  globalThis.self = worker
  try {
    await server.ssrLoadModule('/src/components/Layouts/search.worker.ts')
    worker.onmessage({data: {entries}})
    worker.onmessage({data: {id: 1, query: 'bearer token'}})
    assert.equal(messages[0].id, 1)
    assert.equal(messages[0].entries[0].id, 'guides/auth')
    worker.onmessage({data: {entries: []}})
    worker.onmessage({data: {id: 2, query: 'bearer token'}})
    assert.deepEqual(messages[1], {id: 2, entries: []})
  } finally {
    if (originalSelf === undefined) delete globalThis.self
    else globalThis.self = originalSelf
  }
})
