import assert from 'node:assert/strict'
import {after, test} from 'node:test'
import {createServer as createHttpServer} from 'node:http'
import {createServer} from 'vite'
import {createSSRApp, h} from 'vue'
import {renderToString} from 'vue/server-renderer'

const server = await createServer({server: {middlewareMode: true, hmr: {server: createHttpServer()}}})
after(() => server.close())
const {groupOperationsByTags, tagGroupOperations} = await server.ssrLoadModule('/src/core/openapi/tags.ts')
const {getInlineOperations} = await server.ssrLoadModule('/src/core/openapi/utils.ts')
const {parseSpecification} = await server.ssrLoadModule('/src/core/openapi/specification.ts')
const {resolveReference} = await server.ssrLoadModule('/src/core/openapi/references.ts')
const {default: Pages} = await server.ssrLoadModule('/src/components/Layouts/Pages.vue')
const info = {title: 'Tags API', version: '1'}
const paths = {'/pets': {get: {operationId: 'pets', summary: 'List pets', tags: ['pets', 'animals'], responses: {}}}}
const operations = getInlineOperations(paths)

async function render(document, hash = '#overview', guides) {
  const previousWindow = globalThis.window
  globalThis.window = {location: {href: `https://example.com/${hash}`}}
  try { return await renderToString(createSSRApp({render: () => h(Pages, {document, guides})})) }
  finally {
    if (previousWindow === undefined) delete globalThis.window
    else globalThis.window = previousWindow
  }
}

test('3.2 parent relationships work independently of declaration and operation tag order', () => {
  for (const names of [['pets', 'animals'], ['animals', 'pets']]) {
    const document = {openapi: '3.2.0', tags: [
      {name: 'pets', summary: 'Pets', parent: 'animals', kind: 'nav'},
      {name: 'animals', summary: 'Animals', parent: 'catalog'},
      {name: 'catalog', summary: 'Catalog'}, {name: 'unused'},
    ]}
    const entries = [{...operations[0], operation: {...operations[0].operation, tags: names}}]
    const before = JSON.stringify({document, entries})
    const {groups} = groupOperationsByTags(document, entries)
    assert.deepEqual(groups.map(group => group.name), ['Catalog'])
    assert.equal(groups[0].children[0].name, 'Animals')
    assert.equal(groups[0].children[0].children[0].name, 'Pets')
    assert.equal(groups[0].children[0].operations.length, 1)
    assert.equal(tagGroupOperations(groups[0]).length, 1)
    assert.equal(JSON.stringify({document, entries}), before)
  }
})

test('multiple tags are flat siblings without explicit parents and repeated tags are deduplicated', () => {
  const document = {tags: [{name: 'animals'}, {name: 'pets'}]}
  const entries = [{...operations[0], operation: {...operations[0].operation, tags: ['pets', 'animals', 'pets']}}]
  const {groups} = groupOperationsByTags(document, entries)
  assert.deepEqual(groups.map(group => group.name), ['animals', 'pets'])
  for (const group of groups) {
    assert.equal(group.children.length, 0)
    assert.equal(group.operations.length, 1)
  }
})

test('legacy x-tagGroups follows group/member order, supports shared tags and omits unlisted tags', () => {
  for (const openapi of [undefined, '3.0.3', '3.1.0']) {
    const document = {openapi, tags: [{name: 'pets'}, {name: 'animals'}], 'x-tagGroups': [
      {name: 'Catalog', tags: ['animals', 'pets', 'pets', 'missing']},
      {name: 'Shared', tags: ['pets']}, {name: 'Empty', tags: ['missing']},
    ]}
    const entries = [...operations, {...operations[0], id: 'other', operation: {tags: ['unlisted']}},
      {...operations[0], id: 'status', operation: {}}]
    const {groups, untagged} = groupOperationsByTags(document, entries)
    assert.deepEqual(groups.map(group => group.name), ['Catalog', 'Shared'])
    assert.deepEqual(groups[0].children.map(group => group.name), ['animals', 'pets'])
    assert.equal(tagGroupOperations(groups[0]).length, 1)
    assert.deepEqual(untagged.map(operation => operation.id), ['status'])
  }
})

test('3.2 ignores x-tagGroups entirely, including malformed extension data', () => {
  for (const openapi of ['3.2.0', '3.2.1']) {
    for (const extension of [[{name: 'Legacy', tags: ['pets']}], {}, [null]]) {
      const {groups} = groupOperationsByTags({openapi, tags: [{name: 'pets', parent: 'animals'}, {name: 'animals'}],
        'x-tagGroups': extension,
      }, operations)
      assert.deepEqual(groups.map(group => group.name), ['animals'])
      assert.equal(groups[0].children[0].name, 'pets')
    }
  }
})

test('missing parents and cycles in programmatic documents remain reachable', () => {
  for (const tags of [
    [{name: 'pets', parent: 'missing'}],
    [{name: 'pets', parent: 'pets'}],
    [{name: 'pets', parent: 'animals'}, {name: 'animals', parent: 'pets'}],
  ]) {
    const {groups} = groupOperationsByTags({tags}, operations)
    assert.equal(tagGroupOperations(groups.find(group => group.name === 'pets')).length, 1)
  }
})

test('3.2 navigation kinds, summary labels and selected ancestors render for endpoints and webhooks', async () => {
  const document = {openapi: '3.2.0', info, paths: {'/pets': {get: {...paths['/pets'].get, tags: ['partner', 'pets', 'beta']}}},
    tags: [{name: 'pets', summary: 'Pet operations', parent: 'animals', kind: 'nav'},
      {name: 'animals', summary: 'Animal catalog', description: 'Manage **animals**.'},
      {name: 'partner', summary: 'Partners', kind: 'audience'}, {name: 'beta', summary: 'Beta', kind: 'badge'}],
    webhooks: {created: {post: {summary: 'Pet created', tags: ['pets'], responses: {}}}},
  }
  const overview = await render(document)
  assert.match(overview, /Animal catalog/)
  assert.match(overview, /Manage <strong>animals<\/strong>/)
  assert.match(overview, /1 endpoint/)
  const direct = await render(document, '#operations/pets')
  const sidebar = direct.match(/<nav aria-label="API reference"[^>]*>(.*?)<\/nav>/s)[1]
  assert.match(sidebar, /Animal catalog.*Pet operations.*List pets/s)
  assert.equal((sidebar.match(/aria-expanded="true"/g) ?? []).length, 2)
  assert.doesNotMatch(sidebar, /Partners|Beta/)
  assert.match(direct, /aria-label="Operation tags".*Audience: Partners.*Beta/s)
  assert.doesNotMatch(direct, /Audience: Beta/)
  const webhook = await render(document, '#webhooks/created/post')
  assert.match(webhook, /<nav aria-label="Webhooks"[^>]*>.*Animal catalog.*Pet operations.*Pet created/s)
})

test('filtering keeps only ancestors of matching operations and kind-only operations stay ungrouped', () => {
  const document = {tags: [{name: 'pets', parent: 'animals'}, {name: 'animals'}, {name: 'beta', kind: 'badge'}]}
  const entries = [{...operations[0], operation: {tags: ['pets']}}, {...operations[0], id: 'beta', operation: {tags: ['beta']}}]
  const {groups, untagged} = groupOperationsByTags(document, entries)
  assert.equal(groups[0].children[0].name, 'pets')
  assert.equal(untagged[0].id, 'beta')
  assert.deepEqual(groupOperationsByTags(document, []).groups, [])
})

test('nav-section groups operations and renders an always-visible heading for endpoints, guides and webhooks', async () => {
  const document = {openapi: '3.2.0', info, paths: {
    '/pets': {get: {...paths['/pets'].get, tags: ['pets']}},
    '/status': {get: {operationId: 'status', summary: 'Check status', tags: ['catalog'], responses: {}}},
  }, tags: [
    {name: 'pets', summary: 'Pets', parent: 'catalog', kind: 'nav'},
    {name: 'catalog', summary: 'Animal catalog', kind: 'nav-section'},
    {name: 'unused', kind: 'nav-section'},
  ], webhooks: {created: {post: {summary: 'Pet created', tags: ['catalog'], responses: {}}}}}
  const {groups, untagged} = groupOperationsByTags(document, getInlineOperations(document.paths))
  assert.deepEqual(groups.map(group => group.name), ['Animal catalog'])
  assert.equal(groups[0].operations[0].operation.operationId, 'status')
  assert.equal(groups[0].children[0].name, 'Pets')
  assert.equal(tagGroupOperations(groups[0]).length, 2)
  assert.deepEqual(untagged, [])
  assert.deepEqual(groupOperationsByTags(document, []).groups, [])

  const html = await render(document, '#operations/pets', {catalog: '---\ntitle: Catalog guide\ngroup: catalog\n---\nGuide content.'})
  const sidebar = html.match(/<nav aria-label="API reference"[^>]*>(.*?)<\/nav>/s)[1]
  const section = sidebar.match(/<section aria-label="Animal catalog"[^>]*>(.*?)<\/section>/s)[1]
  assert.match(section, /Catalog guide.*Check status.*Pets.*List pets/s)
  assert.equal((section.match(/aria-expanded="true"/g) ?? []).length, 1)
  assert.doesNotMatch(sidebar, /unused/)
  const overview = await render(document)
  assert.match(overview, /<section aria-label="Animal catalog"[^>]*>.*Check status/s)
  assert.match(overview, /<nav aria-label="Webhooks"[^>]*>.*<section aria-label="Animal catalog"[^>]*>.*Pet created/s)
})

test('selected operations open folders through nested nav-sections', async () => {
  const document = {openapi: '3.2.0', info, paths, tags: [
    {name: 'pets', parent: 'catalog'},
    {name: 'catalog', summary: 'Catalog section', parent: 'animals', kind: 'nav-section'},
    {name: 'animals', summary: 'Animals'},
  ]}
  const html = await render(document, '#operations/pets')
  const sidebar = html.match(/<nav aria-label="API reference"[^>]*>(.*?)<\/nav>/s)[1]
  assert.match(sidebar, /Animals.*<section aria-label="Catalog section".*pets.*List pets/s)
  assert.equal((sidebar.match(/aria-expanded="true"/g) ?? []).length, 2)
})

test('parser accepts 3.2 tags and webhook-only documents and rejects malformed tag structures', () => {
  const document = {openapi: '3.2.0', info, paths, tags: [{name: 'pets', summary: 'Pets', parent: 'animals', kind: 'nav'}, {name: 'animals'}]}
  assert.deepEqual(parseSpecification(JSON.stringify(document)), document)
  assert.deepEqual(parseSpecification(JSON.stringify({openapi: '3.2.0', info, webhooks: {created: {post: {responses: {}}}}})).paths, {})
  for (const tags of [{}, [null], [{name: 3}], [{name: 'pets', parent: []}], [{name: 'pets', kind: 2}]]) {
    assert.throws(() => parseSpecification(JSON.stringify({...document, tags})), /tags|Tag/)
  }
  for (const groups of [{}, [null], [{name: 'Catalog', tags: 'pets'}], [{name: 'Catalog', tags: [3]}]]) {
    assert.throws(() => parseSpecification(JSON.stringify({...document, openapi: '3.1.0', 'x-tagGroups': groups})), /x-tagGroups/)
    assert.doesNotThrow(() => parseSpecification(JSON.stringify({...document, 'x-tagGroups': groups})))
  }
})

test('3.2 keeps the existing 3.1 reference sibling policy', () => {
  const document = {openapi: '3.2.0', components: {schemas: {Name: {type: 'string'}}}}
  assert.deepEqual(resolveReference(document, {$ref: '#/components/schemas/Name', maxLength: 10}, 'schema').value,
    {maxLength: 10, allOf: [{type: 'string'}]})
})
