import type {Components, Schema} from './types'
import {unreference} from './utils'
import {createStringExample} from './stringExamples'

/** Resolve local references without changing the document. Recursive branches end in null. */
export function resolveExampleSchema(schema: Schema | undefined, components: Components): Schema | undefined {
  function resolve(current: Schema, ancestors: Set<Schema>): Schema {
    if (ancestors.has(current)) return {type: 'null'}
    const next = new Set(ancestors).add(current)
    let resolved = {...current}
    if (current.$ref) {
      const target = unreference<Schema>(current.$ref, components)
      if (!target) return resolved
      const {$ref, ...overrides} = current
      resolved = {...resolve(target, next), ...overrides}
    }
    if (resolved.properties) {
      resolved.properties = Object.fromEntries(Object.entries(resolved.properties).map(([name, property]) => [name, resolve(property, next)]))
    }
    if (resolved.items) resolved.items = resolve(resolved.items, next)
    for (const key of ['allOf', 'oneOf', 'anyOf', 'prefixItems'] as const) {
      if (resolved[key]) resolved[key] = resolved[key]!.map(child => resolve(child, next))
    }
    return resolved
  }
  return schema ? resolve(schema, new Set()) : undefined
}

/** Create a deterministic JSON example from a resolved schema, including nested examples. */
export function createSchemaExample(schema: Schema | undefined): unknown {
  function generate(current: Schema | undefined, ancestors: Set<Schema>): unknown {
    if (!current) return undefined
    if (current.example !== undefined) return current.example
    if (current.examples?.length) {
      const example = current.examples[0]
      // Match the viewer's support for both raw values and Example objects.
      return example !== null && typeof example === 'object' && 'value' in example ? example.value : example
    }
    if (current.const !== undefined) return current.const
    if (current.default !== undefined) return current.default
    if (current.enum?.length) return current.enum[0]
    if (ancestors.has(current)) return null
    const next = new Set(ancestors).add(current)

    if (current.allOf?.length) {
      const {allOf, ...ownSchema} = current
      const values = allOf.map(child => generate(child, next))
      if (ownSchema.type || ownSchema.properties || ownSchema.items) values.push(generate(ownSchema, next))
      if (values.every(value => value !== null && typeof value === 'object' && !Array.isArray(value))) {
        return Object.assign({}, ...values)
      }
      return values[0]
    }
    const alternative = current.oneOf?.[0] ?? current.anyOf?.[0]
    if (alternative) return generate(alternative, next)

    const type = Array.isArray(current.type) ? current.type.find(type => type !== 'null') ?? 'null' : current.type
    switch (type ?? (current.properties ? 'object' : current.items || current.prefixItems ? 'array' : undefined)) {
      case 'object':
        return Object.fromEntries(Object.entries(current.properties ?? {}).map(([name, property]) => [name, generate(property, next) ?? null]))
      case 'array':
        return current.prefixItems ? current.prefixItems.map(item => generate(item, next) ?? null) : current.items ? [generate(current.items, next) ?? null] : []
      case 'string': return createStringExample(current.format)
      case 'number':
      case 'integer': return 0
      case 'boolean': return true
      default: return null
    }
  }
  return generate(schema, new Set())
}
