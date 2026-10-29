import assert from 'node:assert/strict'
import {after, test} from 'node:test'
import {createServer as createHttpServer} from 'node:http'
import {createServer} from 'vite'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import sanitizeHtml from 'sanitize-html'

const server = await createServer({configFile: false, resolve: {alias: {'@': new URL('../src', import.meta.url).pathname}}, server: {middlewareMode: true, hmr: {server: createHttpServer()}}})
after(() => server.close())
const {default: HighlightedCode} = await server.ssrLoadModule('/src/components/OpenApi/HighlightedCode.tsx')
const text = html => sanitizeHtml(html, {allowedTags: [], allowedAttributes: {}})
const render = props => renderToStaticMarkup(React.createElement(HighlightedCode, props))
const renderCode = code => renderToStaticMarkup(React.createElement('code', null, code))

test('highlighting preserves code and whitespace across supported languages', async () => {
  for (const [language, code] of [
    ['bash', "curl -X POST 'https://example.com' \\\n  -H 'Content-Type: application/json'"],
    ['php', "Http::withToken('secret')\n    ->post('https://example.com', ['active' => true]);"],
    ['json', '{\n  "name": "café 🚀",\n  "active": true\n}\n\n'],
    ['xml', '<pet id="1">\n  <name>café</name>\n</pet>'],
    ['typescript', 'interface Pet {\n  name: string;\n  active: boolean;\n}'],
  ]) {
    const html = await render({code, language})
    assert.equal(text(html), text(renderCode(code)), language)
  }
  for (const code of ['', '\n\n', 'a\r\nb\r\n', 'plain <text> & "quotes"']) {
    assert.equal(text(await render({code, language: 'text'})), text(renderCode(code)))
  }
})

test('untrusted example markup renders as escaped code', async () => {
  const code = '<script>alert(1)</script><img src=x onerror=alert(1)>'
  const html = await render({code, language: 'xml'})
  assert.doesNotMatch(html, /<script|<img/)
  assert.equal(text(html), text(renderCode(code)))
})
