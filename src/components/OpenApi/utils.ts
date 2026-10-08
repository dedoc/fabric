import type {Components, Document, HttpMethod, Operation, PathItem, Paths, Schema as SchemaType} from "./types.ts";

export const httpMethods: HttpMethod[] = ['get', 'post', 'put', 'delete', 'options', 'head', 'patch', 'trace']

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
    const alternatives = unreferencedSchema?.anyOf ?? unreferencedSchema?.oneOf
    if (alternatives?.length) {
        return alternatives.map(alternative => getSchemaTypePreview(alternative)).join(' | ')
    }
    if (unreferencedSchema?.type === 'array') {
        // tuple
        if (! unreferencedSchema.items && unreferencedSchema.prefixItems) {
            return `[${unreferencedSchema.prefixItems.map(i => getSchemaTypePreview(i)).join(', ')}]`
        }
        const itemType = getSchemaTypePreview(unreferencedSchema?.items)
        const item = unreferencedSchema.items
        return `${!item?.$ref && (item?.anyOf?.length || item?.oneOf?.length) ? `(${itemType})` : itemType}[]`
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

export function getWebhookOperations(document: Document): InlineOperation[] {
    function resolve(item: PathItem, seen = new Set<string>()): PathItem {
        if (!item.$ref) return item
        const reference = item.$ref
        if (!reference.startsWith('#/') || seen.has(reference)) throw new Error(`Cannot resolve webhook reference: ${reference}`)
        seen.add(reference)
        let target: any = document
        for (const part of reference.slice(2).split('/')) {
            const key = decodeURIComponent(part).replace(/~1/g, '/').replace(/~0/g, '~')
            target = target && Object.hasOwn(target, key) ? target[key] : undefined
        }
        if (!target || typeof target !== 'object' || Array.isArray(target)) throw new Error(`Cannot resolve webhook reference: ${reference}`)
        const {$ref, ...overrides} = item
        return {...resolve(target, seen), ...overrides}
    }
    return Object.entries(document.webhooks ?? {}).filter(([name]) => !name.startsWith('x-')).flatMap(([name, item]) => {
        const resolved = resolve(item)
        return getInlineOperations({[name]: resolved}).map(entry => ({
            ...entry,
            id: `webhooks/${encodeURIComponent(name)}/${entry.method}`,
            operation: {
                ...entry.operation,
                summary: entry.operation.summary ?? resolved.summary ?? name,
                description: entry.operation.description ?? resolved.description,
                parameters: [...(resolved.parameters ?? []).filter(parameter => !entry.operation.parameters?.some(override =>
                    '$ref' in parameter && '$ref' in override ? parameter.$ref === override.$ref :
                    !('$ref' in parameter) && !('$ref' in override) && parameter.name === override.name && parameter.in === override.in
                )), ...(entry.operation.parameters ?? [])],
            },
        }))
    })
}

export function getInlineOperations (paths: Paths): InlineOperation[] {
    return Object.entries(paths).reduce<InlineOperation[]>((acc, [path, pathItem]) => {
        return acc.concat(httpMethods.filter(method => pathItem[method]).map(method => {
            const operation = pathItem[method]!
            return {
                id: getOperationId(method, path, operation),
                method,
                path,
                operation,
            }
        }))
    }, [])
}
