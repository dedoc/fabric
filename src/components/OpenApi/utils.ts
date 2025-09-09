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
        // tuple
        if (! unreferencedSchema.items && unreferencedSchema.prefixItems) {
            return `[${unreferencedSchema.prefixItems.map(i => getSchemaTypePreview(i)).join(', ')}]`
        }
        return getSchemaTypePreview(unreferencedSchema?.items) + '[]'
    }
    const type = unreferencedSchema?.type ?? ''
    return Array.isArray(type) ? type.map(t => getPrimitiveSchemaTypePreview(t, unreferencedSchema)).join(' | ') : getPrimitiveSchemaTypePreview(type, unreferencedSchema)
}

function getPrimitiveSchemaTypePreview(type: string, schema: SchemaType|undefined): string {
    if (! schema) {
        return type
    }

    if (type === 'string') {
        let result = type
        if (schema.format) {
            result += `<${schema.format}>`
        }
        if (
            (typeof schema.minLength !== 'undefined')
            || (typeof schema.maxLength !== 'undefined')
        ) {
            if (schema.minLength === schema.maxLength) {
                result += `[${schema.minLength}]`
            } else {
                result += `[${schema.minLength ?? ''}..${schema.maxLength ?? ''}]`
            }
        }
        return result
    }

    if (type === 'number' || type === 'integer') {
        let result = type

        if (typeof schema.minimum !== 'undefined' || typeof schema.maximum !== 'undefined') {
            let min = schema.minimum;
            let max = schema.maximum;

            // optionally handle exclusive minimum/maximum
            // if (schema.exclusiveMinimum === true) min = (min ?? 0) + 1; // simple adjustment
            // if (schema.exclusiveMaximum === true) max = (max ?? 0) - 1;

            if (min === max) {
                result += `[${min}]`;
            } else {
                result += `[${min ?? ''}..${max ?? ''}]`;
            }
        }

        return result
    }

    return type
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
    const operationId = operation.operationId ?? `${method.toLowerCase()}-${path.replace(/\//g, '-').replace(/\{/g, '').replace(/}/g, '')}`

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
