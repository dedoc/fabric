import type {Schema} from './types'
import {getSchemaTypePreview} from './utils'

export type SchemaTypePart = {text: string, schemaName?: string}

/** Preserve type punctuation while identifying component names that can be linked. */
export function getSchemaTypeParts(schema?: Schema, original?: Schema): SchemaTypePart[] {
  if (!original?.$ref && original?.allOf) return getSchemaTypeParts(original.allOf[0], original.allOf[0])
  const reference = original?.$ref ?? schema?.$ref
  if (reference) {
    const name = reference.split('/').at(-1) ?? ''
    return [{text: name, schemaName: reference.startsWith('#/components/schemas/') ? name.replace(/~1/g, '/').replace(/~0/g, '~') : undefined}]
  }
  const alternatives = schema?.anyOf ?? schema?.oneOf
  if (alternatives?.length) {
    return alternatives.flatMap((alternative, index) => [
      ...(index ? [{text: ' | '}] : []), ...getSchemaTypeParts(alternative),
    ])
  }
  if (schema?.type === 'array') {
    if (!schema.items && schema.prefixItems) {
      return [{text: '['}, ...schema.prefixItems.flatMap((item, index) => [
        ...(index ? [{text: ', '}] : []), ...getSchemaTypeParts(item),
      ]), {text: ']'}]
    }
    const item = schema.items
    const isUnion = !item?.$ref && !!(item?.anyOf?.length || item?.oneOf?.length)
    return [...(isUnion ? [{text: '('}] : []), ...getSchemaTypeParts(item), {text: isUnion ? ')[]' : '[]'}]
  }
  return [{text: getSchemaTypePreview(schema, original)}]
}
