import type {Components, Document, Example, MediaType} from './types'
import {resolveReference} from './references'
import type {ReferenceIssue} from './references'
import {createSchemaExample, resolveExampleSchema} from './schemaExamples'
import {createXmlExample} from './xmlExamples'
import {directionalExample} from './schemaUsage'
import type {SchemaDirection} from './schemaUsage'

export function isJsonContentType(contentType: string): boolean {
  const type = contentType.split(';')[0].trim().toLowerCase()
  return type === 'application/json' || type === 'text/json' || type.endsWith('+json')
}

export function isXmlContentType(contentType: string): boolean {
  const type = contentType.split(';')[0].trim().toLowerCase()
  return type === 'application/xml' || type === 'text/xml' || type.endsWith('+xml')
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
  if (!isXmlContentType(contentType)) return JSON.stringify(value, null, 2) ?? ''

  // Media-level XML strings are already serialized; keep them exactly as supplied.
  const entry = Object.values(media.examples ?? {})[0]
  const named = resolveReference<Example>(document, entry).value
  if (typeof value === 'string' && (media.example !== undefined || named?.value !== undefined)) return value
  const schema = resolveExampleSchema(media.schema, components, document)
  const referenceName = media.schema?.$ref?.split('/').pop()?.replace(/~1/g, '/').replace(/~0/g, '~')
  return createXmlExample(value, schema, referenceName ?? 'root')
}
