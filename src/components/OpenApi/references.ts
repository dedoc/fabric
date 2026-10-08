import type {Document} from './types'
import {resolveLocalReference} from './localReferences'

export type ReferenceKind = 'schema' | 'reference' | 'pathItem'
export type ReferenceIssue = {reference: string, message: string}
export type ReferenceResolution<T> = {value?: T, issues: ReferenceIssue[]}

const messages = {
  missing: 'Reference target was not found',
  invalid: 'Invalid or unsupported local pointer',
  external: 'External references are not supported; bundle this specification first',
  circular: 'Circular reference alias chain has no concrete target',
}

/** Resolve Reference Objects; preserve schema conjunctions instead of overwriting constraints. */
export function resolveReference<T>(document: Document, entry: unknown, kind: ReferenceKind = 'reference'): ReferenceResolution<T> {
  if (entry === undefined) return {issues: []}
  const issues: ReferenceIssue[] = []
  const seen = new Set<object>()
  const layers: Record<string, unknown>[] = []
  let value: unknown = entry
  while (value !== null && typeof value === 'object' && !Array.isArray(value) && Object.hasOwn(value, '$ref')) {
    const object = value as Record<string, unknown>
    if (kind === 'schema' && document.openapi?.startsWith('3.1.') && Object.hasOwn(object, '$id')) {
      return {issues: [{reference: String(object.$id), message: 'Schema resource scopes ($id) are not supported; use document-root pointers'}]}
    }
    if (seen.has(object)) return {issues: [{reference: String(object.$ref), message: messages.circular}]}
    seen.add(object)
    if (typeof object.$ref !== 'string') return {issues: [{reference: String(object.$ref), message: messages.invalid}]}
    const result = resolveLocalReference(document, object.$ref, false)
    if (result.status !== 'resolved') return {issues: [{reference: result.reference, message: messages[result.status]}]}
    const {$ref, ...siblings} = object
    layers.push(siblings)
    value = result.value
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return {issues: [{reference: layers.length ? String((entry as {$ref: string}).$ref) : '', message: 'Reference target must be a supported object'}]}
  }
  let resolved = value as Record<string, unknown>
  if (kind === 'schema' && document.openapi?.startsWith('3.1.') && Object.hasOwn(resolved, '$id')) {
    return {issues: [{reference: String(resolved.$id), message: 'Schema resource scopes ($id) are not supported; use document-root pointers'}]}
  }
  for (const siblings of layers.reverse()) {
    if (kind === 'pathItem') {
      const conflicts = Object.keys(siblings).filter(key => Object.hasOwn(resolved, key))
      if (conflicts.length) issues.push({reference: String((entry as {$ref: string}).$ref), message: `Conflicting Path Item siblings (${conflicts.join(', ')}); referenced fields take precedence`})
      resolved = {...siblings, ...resolved}
    } else if (document.openapi?.startsWith('3.1.')) {
      if (kind === 'schema' && Object.keys(siblings).length) {
        // Schema siblings apply together with the target in JSON Schema 2020-12.
        resolved = {...siblings, allOf: [resolved, ...(Array.isArray(siblings.allOf) ? siblings.allOf : [])]}
      } else if (kind === 'reference') {
        resolved = {...resolved, ...Object.fromEntries(Object.entries(siblings).filter(([key]) => key === 'summary' || key === 'description'))}
      }
    }
    // OpenAPI 3.0 Reference Object siblings are ignored.
  }
  return {value: resolved as T, issues}
}
