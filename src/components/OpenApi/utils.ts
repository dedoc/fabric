import type {Components, Operation, Paths, Schema as SchemaType} from "./types.ts";

export type InlineOperation = {
    id: string,
    method: string,
    path: string,
    operation: Operation,
}

export function getSchemaTypePreview (unreferencedSchema: SchemaType|undefined, schema: SchemaType|undefined = undefined): string {
    if (schema?.$ref) {
        return schema.$ref.split('/').at(-1) ?? ''
    }
    if (schema?.allOf) {
        return getSchemaTypePreview(schema.allOf[0], schema.allOf[0])
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
        /** @ts-ignore */
        result = result[pathItem]
    })
    return result as T|undefined
}

export function getOperationId (method: string, path: string, operation: Operation) {
    const operationId = operation.operationId ?? `${method.toLowerCase()}-${path.replace(/\//g, '-').replace(/\{/g, '').replace(/\}/g, '')}`

    return 'operations/' + encodeURIComponent(operationId)
}

export function getOperationTitle (path: string, operation: Operation) {
    return operation.summary ?? operation.operationId ?? path
}

export function getInlineOperations (paths: Paths): InlineOperation[] {
    return Object.entries(paths).reduce<InlineOperation[]>((acc, [path, pathItem]) => {
        return acc.concat(Object.entries(pathItem).map(([method, operation]) => {
            return {
                id: getOperationId(method, path, operation),
                method,
                path,
                operation,
            }
        }))
    }, [])
}
