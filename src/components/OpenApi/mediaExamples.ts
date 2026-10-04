import type {Components, Example, MediaType} from './types'
import {unreference} from './utils'
import {createSchemaExample, resolveExampleSchema} from './schemaExamples'
import {createXmlExample} from './xmlExamples'

export function isJsonContentType(contentType: string): boolean {
  const type = contentType.split(';')[0].trim().toLowerCase()
  return type === 'application/json' || type === 'text/json' || type.endsWith('+json')
}

export function isXmlContentType(contentType: string): boolean {
  const type = contentType.split(';')[0].trim().toLowerCase()
  return type === 'application/xml' || type === 'text/xml' || type.endsWith('+xml')
}

/** Media examples take precedence over schema examples and generated values. */
export function getMediaExample(media: MediaType | undefined, components: Components, generate = true): unknown {
  if (!media) return undefined
  const entry = Object.values(media.examples ?? {})[0]
  const named = entry && ('$ref' in entry ? unreference<Example>(entry.$ref, components) : entry)
  const schema = resolveExampleSchema(media.schema, components)
  let value = media.example !== undefined ? media.example : named?.value
  if (value === undefined && (generate || schema?.example !== undefined || schema?.examples?.length)) {
    value = createSchemaExample(schema)
  }
  return value
}

export function formatMediaExample(media: MediaType | undefined, contentType: string, components: Components, generate = true): string {
  const value = getMediaExample(media, components, generate || isXmlContentType(contentType))
  if (!media || value === undefined) return ''
  if (!isXmlContentType(contentType)) return JSON.stringify(value, null, 2) ?? ''

  // Media-level XML strings are already serialized; keep them exactly as supplied.
  const entry = Object.values(media.examples ?? {})[0]
  const named = entry && ('$ref' in entry ? unreference<Example>(entry.$ref, components) : entry)
  if (typeof value === 'string' && (media.example !== undefined || named?.value !== undefined)) return value
  const schema = resolveExampleSchema(media.schema, components)
  const referenceName = media.schema?.$ref?.split('/').pop()?.replace(/~1/g, '/').replace(/~0/g, '~')
  return createXmlExample(value, schema, referenceName ?? 'root')
}
