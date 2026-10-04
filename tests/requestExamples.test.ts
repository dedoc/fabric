import assert from 'node:assert/strict'
import {test} from 'node:test'
import {spawnSync} from 'node:child_process'
import {createRequestExample, requestExampleSenders} from '../src/components/OpenApi/requestExamples'
import type {MediaType} from '../src/components/OpenApi/types'

function render(sender: string, contentType = '', media?: MediaType, method = 'post') {
  return requestExampleSenders.find(item => item.id === sender)!.generate(createRequestExample(
    'https://example.com/', '/pets', method, contentType, media, {},
  ))
}

test('sender registry exposes Bash and Laravel with the same interface', () => {
  assert.deepEqual(requestExampleSenders.map(({id, label}) => [id, label]), [['bash', 'Bash'], ['laravel', 'Laravel']])
  assert.equal(render('bash', '', undefined, 'get'), "curl -X GET 'https://example.com/pets'")
  assert.equal(render('laravel', '', undefined, 'get'), "use Illuminate\\Support\\Facades\\Http;\n\n$response = Http::send('GET', 'https://example.com/pets');")
})

test('Laravel JSON preserves nested data, falsy values, and PHP string escaping', () => {
  const code = render('laravel', 'application/problem+json', {example: {
    name: "dog's \\ $name", enabled: false, count: 0, nothing: null, empty: {}, items: ['one', 'two'],
  }})
  assert.match(code, /withHeaders\(\['Content-Type' => 'application\/problem\+json'\]\)/)
  assert.match(code, /->send\('POST', 'https:\/\/example.com\/pets', \[/)
  assert.ok(code.includes("'name' => 'dog\\'s \\\\ $name'"))
  assert.match(code, /'enabled' => false/)
  assert.match(code, /'count' => 0/)
  assert.match(code, /'nothing' => null/)
  assert.match(code, /'empty' => \(object\) \[\]/)
  assert.match(code, /'items' => \[/)
  assert.match(render('laravel', 'application/json', {example: null}), /withBody\('null', 'application\/json'\)/)
})

test('Laravel and Bash serialize selected XML rather than forcing JSON', () => {
  const media = {schema: {type: 'object', xml: {name: 'pet'}, properties: {id: {type: 'integer', example: 7}}}}
  assert.match(render('laravel', 'application/xml', media, 'put'), /withBody\('<\?xml/)
  assert.match(render('laravel', 'application/xml', media, 'put'), /->send\('PUT'/)
  assert.match(render('bash', 'application/xml', media), /-H 'Content-Type: application\/xml'/)
  assert.match(render('bash', 'application/xml', media), /<id>7<\/id>/)
})

test('Laravel form parameters share Bash complex field serialization', () => {
  const media = {example: {id: 7, category: {id: 1, name: 'Dogs'}}}
  const code = render('laravel', 'application/x-www-form-urlencoded', media)
  assert.match(code, /Http::asForm\(\)/)
  assert.match(code, /'form_params' => \[/)
  assert.match(code, /'id' => '7'/)
  assert.match(code, /'category' => '\{"id":1,"name":"Dogs"\}'/)
  assert.match(render('bash', 'application/x-www-form-urlencoded', media), /--data-urlencode 'category=\{"id":1,"name":"Dogs"\}'/)
  assert.match(render('laravel', 'application/x-www-form-urlencoded', {example: {}}), /'form_params' => \[\]/)
})

test('Laravel preserves repeated form fields and raw percent-encoded examples', () => {
  const code = render('laravel', 'application/x-www-form-urlencoded', {example: {tags: ['a&b', 'c+d']}})
  assert.match(code, /withBody\('tags=a%26b&tags=c%2Bd', 'application\/x-www-form-urlencoded'\)/)
  assert.doesNotMatch(code, /form_params/)
  for (const sender of ['bash', 'laravel']) {
    const raw = render(sender, 'application/x-www-form-urlencoded', {example: 'name=a%26b'})
    assert.match(raw, /name=a%26b/)
    assert.doesNotMatch(raw, /%2526/)
  }
})

test('multipart examples let the sender generate its boundary', () => {
  const media = {example: {name: 'doggie', metadata: {id: 1}}}
  const bash = render('bash', 'multipart/form-data', media)
  assert.match(bash, /--form-string 'name=doggie'/)
  assert.doesNotMatch(bash, /-H 'Content-Type/)
  const laravel = render('laravel', 'multipart/form-data', media)
  assert.match(laravel, /Http::asMultipart\(\)/)
  assert.match(laravel, /'multipart' => \[/)
  assert.match(laravel, /'contents' => '\{"id":1\}'/)
})

test('generated Laravel examples parse as PHP', t => {
  if (spawnSync('php', ['--version']).error) return t.skip('PHP runtime unavailable')
  for (const [type, media] of [
    ['application/json', {example: {name: "dog's \\ $name", children: [{enabled: false}], empty: {}}}],
    ['application/xml', {example: '<pet>doggie</pet>'}],
    ['application/x-www-form-urlencoded', {example: {tags: ['one', 'two']}}],
    ['multipart/form-data', {example: {name: 'doggie'}}],
  ] as [string, MediaType][]) {
    const result = spawnSync('php', ['-l'], {input: '<?php\n' + render('laravel', type, media), encoding: 'utf8'})
    assert.equal(result.status, 0, result.stdout + result.stderr)
  }
})
