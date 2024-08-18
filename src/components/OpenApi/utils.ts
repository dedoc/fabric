import type {Components, Schema as SchemaType} from "./types.ts";

export function getSchemaTypePreview (unreferencedSchema: SchemaType|undefined, schema: SchemaType|undefined = undefined): string {
    if (schema?.$ref) {
        return schema.$ref.split('/').at(-1) ?? ''
    }
    if (unreferencedSchema?.$ref) {
        return unreferencedSchema.$ref.split('/').at(-1) ?? ''
    }
    if (unreferencedSchema?.type === 'array') {
        return getSchemaTypePreview(unreferencedSchema?.items) + '[]'
    }
    const type = unreferencedSchema?.type ?? ''
    return Array.isArray(type) ? type.join(' or ') : type
}

export function unreference<T>(reference: string, components: Components): T|undefined {
    const path = reference.split('/').slice(2)
    let result = components
    path.forEach((pathItem) => {
        if (! result) {
            return
        }
        result = result[pathItem]
    })
    return result as T
}
