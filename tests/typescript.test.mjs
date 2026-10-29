import {readdirSync} from 'node:fs'
import {createServer as createHttpServer} from 'node:http'
import {after} from 'node:test'
import {fileURLToPath} from 'node:url'
import {createServer} from 'vite'

const server = await createServer({
  root: fileURLToPath(new URL('../', import.meta.url)),
  configFile: false,
  resolve: {alias: {'@': fileURLToPath(new URL('../src', import.meta.url))}},
  optimizeDeps: {noDiscovery: true, include: []},
  server: {middlewareMode: true, hmr: {server: createHttpServer()}},
})
after(() => server.close())
for (const file of readdirSync(new URL('./', import.meta.url)).filter(file => file.endsWith('.test.ts'))) {
  await server.ssrLoadModule(`/tests/${file}`)
}
