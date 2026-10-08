import type {ComputedRef, InjectionKey} from 'vue'
import type {Schema} from './types'

export type SchemaDirection = 'request' | 'response' | 'neutral'
export const schemaDirectionKey: InjectionKey<ComputedRef<SchemaDirection>> = Symbol('schemaDirection')

export function schemaFlag(schema: Schema, flag: 'readOnly' | 'writeOnly' | 'deprecated'): boolean {
  return schema[flag] === true || !!schema.allOf?.some(member => schemaFlag(member, flag))
}

export function isSchemaVisible(schema: Schema, direction: SchemaDirection): boolean {
  return !(direction === 'request' && schemaFlag(schema, 'readOnly')) && !(direction === 'response' && schemaFlag(schema, 'writeOnly'))
}

/** Apply usage annotations to values, including authored examples, without mutating them. */
export function directionalExample(value: unknown, schema: Schema | undefined, direction: SchemaDirection): unknown {
  if (!schema || direction === 'neutral' || value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map((item, index) => directionalExample(item, schema.prefixItems?.[index] ?? schema.items, direction))
  const alternatives = schema.oneOf ?? schema.anyOf ?? []
  const objectAlternatives = alternatives.filter(member => member.type !== 'null')
  const alternative = objectAlternatives.find(member => Object.entries(member.properties ?? {}).some(([name, property]) =>
    property.const !== undefined && (value as Record<string, unknown>)[name] === property.const
    || property.enum?.includes((value as Record<string, unknown>)[name])
  )) ?? objectAlternatives[0]
  const members = [...(schema.allOf ?? []), ...(alternative ? [alternative] : [])]
  let result = value as Record<string, unknown>
  for (const member of members) result = directionalExample(result, member, direction) as Record<string, unknown>
  return Object.fromEntries(Object.entries(result).flatMap(([name, item]) => {
    const property = schema.properties?.[name] ?? (typeof schema.additionalProperties === 'object' ? schema.additionalProperties : undefined)
    return property && !isSchemaVisible(property, direction) ? [] : [[name, directionalExample(item, property, direction)]]
  }))
}
