import type {Schema} from '@/core/openapi/types'

export type SchemaDirection = 'request' | 'response' | 'neutral'

export function schemaFlag(schema: Schema, flag: 'readOnly' | 'writeOnly' | 'deprecated'): boolean {
  const visited = new Set<Schema>()
  const pending = [schema]
  while (pending.length) {
    const current = pending.pop()!
    if (visited.has(current)) continue
    visited.add(current)
    if (current[flag] === true) return true
    pending.push(...(current.allOf ?? []))
  }
  return false
}

export function isSchemaVisible(schema: Schema, direction: SchemaDirection): boolean {
  return !(direction === 'request' && schemaFlag(schema, 'readOnly')) && !(direction === 'response' && schemaFlag(schema, 'writeOnly'))
}

/** Apply usage annotations to values, including authored examples, without mutating them. */
export function directionalExample(value: unknown, schema: Schema | undefined, direction: SchemaDirection, active = new Set<Schema>()): unknown {
  if (!schema || direction === 'neutral' || value === null || typeof value !== 'object') return value
  if (active.has(schema)) return value
  const next = new Set(active).add(schema)
  if (Array.isArray(value)) return value.map((item, index) => directionalExample(item, schema.prefixItems?.[index] ?? schema.items, direction))
  const alternatives = schema.oneOf ?? schema.anyOf ?? []
  const objectAlternatives = alternatives.filter(member => member.type !== 'null')
  const alternative = objectAlternatives.find(member => Object.entries(member.properties ?? {}).some(([name, property]) =>
    property.const !== undefined && (value as Record<string, unknown>)[name] === property.const
    || property.enum?.includes((value as Record<string, unknown>)[name])
  )) ?? objectAlternatives[0]
  const members = [...(schema.allOf ?? []), ...(alternative ? [alternative] : [])]
  let result = value as Record<string, unknown>
  for (const member of members) result = directionalExample(result, member, direction, next) as Record<string, unknown>
  return Object.fromEntries(Object.entries(result).flatMap(([name, item]) => {
    const property = schema.properties?.[name] ?? (typeof schema.additionalProperties === 'object' ? schema.additionalProperties : undefined)
    return property && !isSchemaVisible(property, direction) ? [] : [[name, directionalExample(item, property, direction)]]
  }))
}
