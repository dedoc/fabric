import {parse} from 'yaml'
import type {Document} from '@/core/openapi/types'
import {httpMethods} from '@/core/openapi/utils'

export class SpecificationError extends Error {}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function requireObject(value: unknown, location: string): asserts value is Record<string, unknown> {
  if (!isObject(value)) throw new SpecificationError(`${location} must be an object.`)
}

/** Structural checks for the renderer, not a complete OpenAPI conformance validator. */
export function parseSpecification(source: string): Document {
  let value: unknown
  try { value = parse(source, {maxAliasCount: 100}) }
  catch { throw new SpecificationError('The specification is not valid JSON or YAML.') }
  requireObject(value, 'The specification')
  if (typeof value.openapi !== 'string' || !/^3\.[012]\.\d+$/.test(value.openapi)) {
    throw new SpecificationError('Use an OpenAPI 3.0, 3.1 or 3.2 specification.')
  }
  requireObject(value.info, 'info')
  for (const field of ['title', 'version']) {
    if (typeof value.info[field] !== 'string' || !value.info[field].trim()) {
      throw new SpecificationError(`info.${field} must be a non-empty string.`)
    }
  }
  if (value.tags !== undefined) {
    if (!Array.isArray(value.tags)) throw new SpecificationError('tags must be an array.')
    for (const tag of value.tags) {
      requireObject(tag, 'tags entries')
      if (typeof tag.name !== 'string' || !tag.name) throw new SpecificationError('tags entries need a name.')
      for (const field of ['summary', 'parent', 'kind']) {
        if (tag[field] !== undefined && typeof tag[field] !== 'string') throw new SpecificationError(`Tag ${field} must be a string.`)
      }
    }
  }
  if (!value.openapi.startsWith('3.2.') && value['x-tagGroups'] !== undefined) {
    if (!Array.isArray(value['x-tagGroups'])) throw new SpecificationError('x-tagGroups must be an array.')
    for (const group of value['x-tagGroups']) {
      requireObject(group, 'x-tagGroups entries')
      if (typeof group.name !== 'string' || !Array.isArray(group.tags) || group.tags.some(tag => typeof tag !== 'string')) {
        throw new SpecificationError('x-tagGroups entries need a name and an array of tag names.')
      }
    }
  }
  if (value.paths === undefined && value.webhooks !== undefined && !value.openapi.startsWith('3.0.')) value.paths = {}
  requireObject(value.paths, 'paths')
  if (value.webhooks !== undefined) {
    requireObject(value.webhooks, 'webhooks')
    for (const [name, item] of Object.entries(value.webhooks)) {
      if (name.startsWith('x-')) continue
      requireObject(item, `webhooks.${name}`)
      for (const method of httpMethods) {
        if (item[method] === undefined) continue
        requireObject(item[method], `webhooks.${name}.${method}`)
        requireObject(item[method].responses, `Responses for webhook ${name}`)
      }
    }
  }
  if (value.components !== undefined) {
    requireObject(value.components, 'components')
    for (const [name, entries] of Object.entries(value.components)) {
      if (!name.startsWith('x-')) requireObject(entries, `components.${name}`)
    }
  }
  for (const [path, item] of Object.entries(value.paths)) {
    if (path.startsWith('x-')) continue
    if (!path.startsWith('/')) throw new SpecificationError('Each API path must start with /.')
    requireObject(item, `paths.${path}`)
    for (const method of httpMethods) {
      if (item[method] === undefined) continue
      requireObject(item[method], `${method.toUpperCase()} ${path}`)
      requireObject(item[method].responses, `Responses for ${method.toUpperCase()} ${path}`)
    }
  }

  // Payload examples and extensions are data, not schema keywords.
  const ancestors = new Set<object>()
  const maps = ['paths', 'webhooks', 'schemas', 'properties', 'content', 'encoding', 'responses', 'headers', 'securitySchemes', 'requestBodies', 'callbacks', 'links', 'pathItems', 'variables', 'scopes']
  function inspect(node: unknown, location: string, depth = 0, dictionary = false, context?: 'links' | 'link' | 'examples' | 'example') {
    if (node === null || typeof node !== 'object') return
    if (depth > 100 || ancestors.has(node)) throw new SpecificationError('The specification contains cyclic or excessively nested data.')
    ancestors.add(node)
    if (Array.isArray(node)) {
      node.forEach((item, index) => inspect(item, `${location}[${index}]`, depth + 1, dictionary))
    } else {
      const components = location === 'specification.components'
      for (const [key, item] of Object.entries(node)) {
        if (key.startsWith('x-') || (!dictionary && !components && ['example', 'examples', 'default', 'const', 'enum'].includes(key))) continue
        // Example Object metadata is structural; its value is arbitrary API data.
        if (context === 'example' && key === 'value') continue
        const at = `${location}.${key}`
        // Link values are runtime expressions or arbitrary payloads, rather than
        // the operation's parameter array and Request Body Object.
        if (context === 'link' && ['parameters', 'requestBody'].includes(key)) {
          if (key === 'parameters') requireObject(item, at)
          continue
        }
        if (!dictionary && !components) {
          if (['description', 'summary', '$ref'].includes(key) && typeof item !== 'string') throw new SpecificationError(`${at} must be a string.`)
          if (['properties', 'content', 'encoding', 'responses', 'headers', 'requestBody', 'items'].includes(key)) requireObject(item, at)
          if (['parameters', 'servers', 'security', 'tags', 'required', 'allOf', 'anyOf', 'oneOf', 'prefixItems'].includes(key) && !Array.isArray(item) && !(key === 'required' && typeof item === 'boolean')) {
            throw new SpecificationError(`${at} must be an array.`)
          }
          if (key === 'servers' && Array.isArray(item)) {
            for (const server of item) {
              requireObject(server, at)
              if (typeof server.url !== 'string') throw new SpecificationError(`${at} entries need a URL.`)
              try { new URL(server.url.replace(/\{[^{}]+\}/g, 'variable'), 'https://example.com') }
              catch { throw new SpecificationError(`${at} contains an invalid URL.`) }
            }
          }
        }
        inspect(item, at, depth + 1, components || (!dictionary && (maps.includes(key) || key === 'security')),
          context === 'examples' ? 'example' : components && key === 'examples' ? 'examples'
            : context === 'links' ? 'link' : (!dictionary && key === 'links') || (components && key === 'links') ? 'links' : undefined)
      }
    }
    ancestors.delete(node)
  }
  inspect(value, 'specification')
  return value as Document
}

export async function fetchSpecification(url: string, signal?: AbortSignal): Promise<{document: Document, documentUrl: string}> {
  const controller = new AbortController()
  const abort = () => controller.abort()
  signal?.addEventListener('abort', abort, {once: true})
  if (signal?.aborted) controller.abort()
  const timeout = setTimeout(abort, 30_000)
  try {
    const response = await fetch(url, {signal: controller.signal})
    if (!response.ok) throw new SpecificationError(`The specification could not be loaded (HTTP ${response.status}).`)
    const documentUrl = response.url || new URL(url, typeof window === 'undefined' ? undefined : window.location.href).href
    return {document: parseSpecification(await response.text()), documentUrl}
  } catch (error) {
    if (error instanceof SpecificationError) throw error
    if (controller.signal.aborted && !signal?.aborted) throw new SpecificationError('Loading the specification timed out. Please try again.')
    throw new SpecificationError('The specification could not be loaded. Check the URL and connection, then try again.')
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener('abort', abort)
  }
}
