import type {Components, Document, Example, MediaType, Schema} from '@/core/openapi/types'
import {resolveReference} from '@/core/openapi/references'
import type {ReferenceIssue} from '@/core/openapi/references'
import {createSchemaExample, resolveExampleSchema} from '@/core/openapi/schemaExamples'
import {createXmlExample} from '@/core/openapi/xmlExamples'
import {directionalExample, isSchemaVisible} from '@/core/openapi/schemaUsage'
import type {SchemaDirection} from '@/core/openapi/schemaUsage'

export function isJsonContentType(contentType: string): boolean {
  const type = contentType.split(';')[0].trim().toLowerCase()
  return type === 'application/json' || type === 'text/json' || type.endsWith('+json')
}

export function isXmlContentType(contentType: string): boolean {
  const type = contentType.split(';')[0].trim().toLowerCase()
  return type === 'application/xml' || type === 'text/xml' || type.endsWith('+xml')
}

function hasBinarySchema(schema: Schema | undefined, direction: SchemaDirection, visited = new Set<Schema>()): boolean {
  if (!schema || visited.has(schema) || !isSchemaVisible(schema, direction)) return false
  visited.add(schema)
  const alternative = (schema.oneOf ?? schema.anyOf)?.find(child => child.type !== 'null')
  return schema.format === 'binary' || Object.values(schema.properties ?? {}).some(child => hasBinarySchema(child, direction, visited)) || hasBinarySchema(schema.items, direction, visited) || (schema.allOf ?? []).some(child => hasBinarySchema(child, direction, visited)) || hasBinarySchema(alternative, direction, visited)
}

/** Media examples take precedence over schema examples and generated values. */
export function getMediaExample(media: MediaType | undefined, components: Components, generate = true, document: Document = {components}, report?: (issue: ReferenceIssue) => void, direction: SchemaDirection = 'neutral'): unknown {
  if (!media) return undefined
  const entry = Object.values(media.examples ?? {})[0]
  const result = resolveReference<Example>(document, entry)
  result.issues.forEach(issue => report?.(issue))
  const named = result.value
  const schema = resolveExampleSchema(media.schema, components, document, report)
  let value = media.example !== undefined ? media.example : named?.value
  if (value === undefined && (generate || schema?.example !== undefined || schema?.examples?.length)) {
    value = createSchemaExample(schema, direction)
  }
  return directionalExample(value, schema, direction)
}

export function formatMediaExample(media: MediaType | undefined, contentType: string, components: Components, generate = true, document: Document = {components}, report?: (issue: ReferenceIssue) => void, direction: SchemaDirection = 'neutral'): string {
  const value = getMediaExample(media, components, generate || isXmlContentType(contentType), document, report, direction)
  if (!media || value === undefined) return ''
  if (hasBinarySchema(resolveExampleSchema(media.schema, components, document), direction)) throw new Error('Binary samples require file bytes; text examples cannot represent this body.')
  if (isJsonContentType(contentType)) return JSON.stringify(value, null, 2) ?? ''
  if (!isXmlContentType(contentType)) {
    const type = contentType.split(';')[0].trim().toLowerCase()
    if (type === 'application/x-www-form-urlencoded' || type === 'multipart/form-data') return typeof value === 'string' ? value : JSON.stringify(value, null, 2)
    if (type.startsWith('text/') && typeof value === 'string') return value
    throw new Error(`Cannot serialize ${contentType || 'an unspecified media type'}. Supply a supported text, JSON, XML or form representation.`)
  }

  // Media-level XML strings are already serialized; keep them exactly as supplied.
  const entry = Object.values(media.examples ?? {})[0]
  const named = resolveReference<Example>(document, entry).value
  if (typeof value === 'string' && (media.example !== undefined || named?.value !== undefined)) return value
  const schema = resolveExampleSchema(media.schema, components, document)
  const referenceName = media.schema?.$ref?.split('/').pop()?.replace(/~1/g, '/').replace(/~0/g, '~')
  return createXmlExample(value, schema, referenceName ?? 'root')
}

/** Selection preserves the Example Object, including false, zero and empty-string values. */
export function selectMediaExample(media: MediaType | undefined, name: string | undefined, document: Document): {media: MediaType | undefined, description?: string, source: string} {
  const selected = name ?? Object.keys(media?.examples ?? {})[0]
  const resolution = resolveReference<Example>(document, selected === undefined ? undefined : media?.examples?.[selected])
  if (resolution.issues.length) throw new Error('Cannot resolve the selected media example.')
  const example = resolution.value
  if (example?.externalValue && example.value === undefined) throw new Error('External example values are unavailable. Bundle the value into this document.')
  const schema = resolveExampleSchema(media?.schema, document.components ?? {}, document)
  return {
    media: example?.value !== undefined ? {...media, example: example.value, examples: undefined} : media,
    description: example?.description,
    source: media?.example !== undefined || example?.value !== undefined || schema?.example !== undefined || !!schema?.examples?.length ? 'Supplied example' : 'Generated sample',
  }
}
