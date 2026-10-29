import assert from 'node:assert/strict'
import {readdirSync, readFileSync} from 'node:fs'
import {createServer as createHttpServer} from 'node:http'
import {dirname, isAbsolute, join, relative, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {test} from 'node:test'
import ts from 'typescript'
import {createServer} from 'vite'

const coreRoot = fileURLToPath(new URL('../src/core/', import.meta.url))
const sourceRoot = resolve(coreRoot, '..')
const projectRoot = resolve(coreRoot, '../..')
function sourceFiles(directory) {
  return readdirSync(directory, {withFileTypes: true}).flatMap(entry => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? sourceFiles(path) : entry.name.endsWith('.ts') ? [path] : []
  })
}
const files = sourceFiles(coreRoot)
const frameworkImport = /^(?:vue(?:$|[-/])|@vue\/|react(?:$|[-/])|@base-ui\/)/

test('core imports, including types, stay independent of framework adapters', () => {
  assert.ok(files.length, 'The core must contain TypeScript modules')
  for (const file of files) {
    const {importedFiles} = ts.preProcessFile(readFileSync(file, 'utf8'), true, true)
    for (const {fileName: specifier} of importedFiles) {
      const location = `${relative(projectRoot, file)} imports ${specifier}`
      assert.equal(frameworkImport.test(specifier), false, location)
      if (!specifier.startsWith('.') && !specifier.startsWith('@/')) {
        assert.equal(specifier.startsWith('/'), false, location)
        continue
      }
      const target = specifier.startsWith('@/') ? resolve(sourceRoot, specifier.slice(2)) : resolve(dirname(file), specifier)
      const withinCore = relative(coreRoot, target)
      assert.ok(withinCore && !withinCore.startsWith('..') && !isAbsolute(withinCore), location)
      assert.ok([target, `${target}.ts`, join(target, 'index.ts')].some(path => files.includes(path)), location)
    }
  }
})

test('every core module loads without Vue or browser globals', async () => {
  assert.equal(typeof window, 'undefined')
  assert.equal(typeof document, 'undefined')
  const server = await createServer({
    root: projectRoot,
    configFile: false,
    resolve: {alias: {'@': sourceRoot}},
    optimizeDeps: {noDiscovery: true, include: []},
    plugins: [{
      name: 'reject-framework-runtime',
      enforce: 'pre',
      resolveId(source) {
        assert.equal(frameworkImport.test(source) || source.endsWith('.vue'), false, source)
      },
    }],
    server: {middlewareMode: true, hmr: {server: createHttpServer()}},
  })
  try {
    for (const file of files) await server.ssrLoadModule(`/${relative(projectRoot, file)}`)
  } finally {
    await server.close()
  }
})
