import type {Components, Document, Schema} from './types'
import {resolveReference} from './references'
import type {ReferenceIssue} from './references'
import {createStringExample} from './stringExamples'
import {getSchemaBounds} from './schemaBounds'
import {directionalExample, isSchemaVisible} from './schemaUsage'
import type {SchemaDirection} from './schemaUsage'

/** Check the supported constraints after combining generated members. */
function fitsConstraints(value: unknown, schema: Schema): boolean {
  if (schema.const !== undefined && JSON.stringify(value) !== JSON.stringify(schema.const)) return false
  if (schema.enum && !schema.enum.some(item => JSON.stringify(item) === JSON.stringify(value))) return false
  const type = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value
  const types = Array.isArray(schema.type) ? schema.type : schema.type ? [schema.type] : []
  if (types.length && !types.includes(type as typeof types[number]) && !(types.includes('integer') && typeof value === 'number' && Number.isInteger(value)) && !(schema.nullable && value === null)) return false
  if (typeof value === 'number') {
    const {minimum, maximum} = getSchemaBounds(schema)
    if (minimum && (value < minimum.value || minimum.exclusive && value === minimum.value)) return false
    if (maximum && (value > maximum.value || maximum.exclusive && value === maximum.value)) return false
  }
  if (typeof value === 'string' && ([...value].length < (schema.minLength ?? 0) || [...value].length > (schema.maxLength ?? Infinity))) return false
  if (Array.isArray(value)) {
    if (value.length < (schema.minItems ?? 0) || value.length > (schema.maxItems ?? Infinity)) return false
    if (schema.uniqueItems && new Set(value.map(item => JSON.stringify(item))).size !== value.length) return false
    if (!value.every((item, index) => fitsConstraints(item, schema.prefixItems?.[index] ?? schema.items ?? {}))) return false
  } else if (value !== null && typeof value === 'object') {
    if (!Object.entries(value).every(([name, item]) => fitsConstraints(item, schema.properties?.[name] ?? (typeof schema.additionalProperties === 'object' ? schema.additionalProperties : {})))) return false
  }
  return !schema.allOf || schema.allOf.every(member => fitsConstraints(value, member))
}

/** Resolve local references without changing the document. Recursive branches end in null. */
export function resolveExampleSchema(schema: Schema | undefined, components: Components, document: Document = {components}, report?: (issue: ReferenceIssue) => void): Schema | undefined {
  function resolve(current: Schema, ancestors: Set<Schema>): Schema {
    if (ancestors.has(current)) return {type: 'null'}
    const next = new Set(ancestors).add(current)
    const result = resolveReference<Schema>(document, current, 'schema')
    result.issues.forEach(issue => report?.(issue))
    if (!result.value) return {type: 'null'}
    if (result.value !== current && ancestors.has(result.value)) return {type: 'null'}
    next.add(result.value)
    let resolved = {...result.value}
    if (resolved.properties) {
      resolved.properties = Object.fromEntries(Object.entries(resolved.properties).map(([name, property]) => [name, resolve(property, next)]))
    }
    if (resolved.items) resolved.items = resolve(resolved.items, next)
    if (typeof resolved.additionalProperties === 'object') resolved.additionalProperties = resolve(resolved.additionalProperties, next)
    for (const key of ['allOf', 'oneOf', 'anyOf', 'prefixItems'] as const) {
      if (resolved[key]) resolved[key] = resolved[key]!.map(child => resolve(child, next))
    }
    return resolved
  }
  return schema ? resolve(schema, new Set()) : undefined
}

/** Create a deterministic JSON example from a resolved schema, including nested examples. */
export function createSchemaExample(schema: Schema | undefined, direction: SchemaDirection = 'neutral'): unknown {
  function generate(current: Schema | undefined, ancestors: Set<Schema>, seed = 0): unknown {
    if (!current) return undefined
    if (current.example !== undefined) return current.example
    if (current.examples?.length) {
      const example = current.examples[0]
      // Match the viewer's support for both raw values and Example objects.
      return example !== null && typeof example === 'object' && 'value' in example ? example.value : example
    }
    if (current.const !== undefined) return current.const
    if (current.default !== undefined) return current.default
    if (current.enum?.length) return current.enum[seed % current.enum.length]
    if (ancestors.has(current)) return null
    const next = new Set(ancestors).add(current)

    if (current.allOf?.length) {
      const {allOf, ...ownSchema} = current
      const values = allOf.map(child => generate(child, next))
      if (ownSchema.type || ownSchema.properties || ownSchema.items) values.push(generate(ownSchema, next))
      if (values.every(value => value !== null && typeof value === 'object' && !Array.isArray(value))) {
        const combined = Object.assign({}, ...values)
        if (!fitsConstraints(combined, current)) throw new Error('Cannot combine samples within the allOf constraints. Supply an example.')
        return combined
      }
      const candidate = values.findIndex(value => fitsConstraints(value, current))
      if (candidate < 0) throw new Error('Cannot combine samples within the allOf constraints. Supply an example.')
      return values[candidate]
    }
    const alternatives = current.oneOf ?? current.anyOf
    const alternative = alternatives?.find(child => child.type !== 'null') ?? alternatives?.[0]
    if (alternative) {
      const value = generate(alternative, next)
      if (!fitsConstraints(value, current)) throw new Error('The selected sample conflicts with composition constraints. Supply an example.')
      return value
    }

    const type = Array.isArray(current.type) ? current.type.find(type => type !== 'null') ?? 'null' : current.type
    switch (type ?? (current.properties || current.additionalProperties !== undefined ? 'object' : current.items || current.prefixItems ? 'array' : undefined)) {
      case 'object':
        const properties = Object.fromEntries(Object.entries(current.properties ?? {}).filter(([, property]) => isSchemaVisible(property, direction)).map(([name, property]) => [name, generate(property, next) ?? null]))
        if (typeof current.additionalProperties === 'object') {
          let key = 'additionalProp1'
          while (Object.hasOwn(properties, key)) key += '_'
          properties[key] = generate(current.additionalProperties, next) ?? null
        }
        return properties
      case 'array': {
        const count = Math.max(current.minItems ?? 0, Math.min(current.maxItems ?? Infinity, current.prefixItems?.length ?? (current.items ? 1 : 0)))
        if (count > 100 || count > (current.maxItems ?? Infinity)) throw new Error('Cannot generate an array within these item limits. Supply an example.')
        const values: unknown[] = []
        for (let i = 0; i < count; i++) {
          const item = current.prefixItems?.[i] ?? current.items
          let value: unknown
          let attempt = 0
          do { value = generate(item, next, attempt++) ?? null }
          while (current.uniqueItems && values.some(previous => JSON.stringify(previous) === JSON.stringify(value)) && attempt <= 100)
          if (current.uniqueItems && values.some(previous => JSON.stringify(previous) === JSON.stringify(value))) throw new Error('Cannot generate enough unique array values. Supply an example.')
          values.push(value)
        }
        return values
      }
      case 'string': {
        if (current.format === 'binary' || current.format === 'byte') throw new Error('Binary samples require a supplied file; generated text is unavailable.')
        if (current.pattern) throw new Error('Pattern-constrained strings require a supplied example.')
        let value = createStringExample(current.format) + (seed ? String(seed) : '')
        const min = current.minLength ?? 0, max = current.maxLength ?? Infinity
        if (min > max || min > 4096) throw new Error('Cannot generate a string within these length limits. Supply an example.')
        if (current.format && (value.length < min || value.length > max || seed)) throw new Error('Cannot satisfy format and length/uniqueness constraints. Supply an example.')
        value = value.padEnd(min, 'a').slice(0, max)
        return value
      }
      case 'number':
      case 'integer': {
        const {minimum, maximum} = getSchemaBounds(current)
        const lower = minimum?.value ?? -Infinity, upper = maximum?.value ?? Infinity
        let value = Math.max(lower, Math.min(upper, seed))
        if (type === 'integer') {
          const min = Math.ceil(lower) + (minimum?.exclusive && Number.isInteger(lower) ? 1 : 0)
          const max = Math.floor(upper) - (maximum?.exclusive && Number.isInteger(upper) ? 1 : 0)
          value = Math.max(min, Math.min(max, seed))
          if (min > max) throw new Error('No integer satisfies these bounds. Supply an example.')
        } else if ((minimum?.exclusive && value === lower) || (maximum?.exclusive && value === upper)) {
          value = Number.isFinite(lower) && Number.isFinite(upper) ? lower / 2 + upper / 2 : minimum?.exclusive ? lower + 1 : upper - 1
        }
        if (!Number.isFinite(value) || value < lower || value > upper || (minimum?.exclusive && value === lower) || (maximum?.exclusive && value === upper)) throw new Error('Cannot generate a number within these bounds. Supply an example.')
        return value
      }
      case 'boolean': return seed % 2 === 0
      default: return null
    }
  }
  return directionalExample(generate(schema, new Set()), schema, direction)
}
