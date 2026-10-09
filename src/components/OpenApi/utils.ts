import type {Components, Document, HttpMethod, Operation, PathItem, Paths, Schema as SchemaType} from "./types.ts";
import {resolveReference} from './references'
import type {ReferenceIssue} from './references'
import {effectiveParameters} from './parameters'
import {getSchemaBounds} from './schemaBounds'

export const httpMethods: HttpMethod[] = ['get', 'post', 'put', 'delete', 'options', 'head', 'patch', 'trace']

export type InlineOperation = {
    id: string,
    method: string,
    path: string,
    operation: Operation,
}

export function getSchemaTypePreview (unreferencedSchema: SchemaType|undefined, schema: SchemaType|undefined = undefined): string {
    const preview = schemaTypePreview(unreferencedSchema, schema)
    return unreferencedSchema?.nullable && typeof unreferencedSchema.type === 'string' && unreferencedSchema.type !== 'null' ? `${preview} | null` : preview
}

function schemaTypePreview(unreferencedSchema: SchemaType|undefined, schema: SchemaType|undefined): string {
    if (schema?.$ref) {
        return schema.$ref.split('/').at(-1) ?? ''
    }
    if (schema?.allOf) {
        return getSchemaTypePreview(schema.allOf[0], schema.allOf[0])
    }
    if (unreferencedSchema?.$ref) {
        return unreferencedSchema.$ref.split('/').at(-1) ?? ''
    }
    if (unreferencedSchema && Object.keys(unreferencedSchema).length === 0) {
        return 'any'
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
        return `${!item?.$ref && (item?.anyOf?.length || item?.oneOf?.length || Array.isArray(item?.type) && item.type.length > 1 || item?.nullable) ? `(${itemType})` : itemType}[]`
    }
    const type = unreferencedSchema?.type ?? (unreferencedSchema?.properties || unreferencedSchema?.additionalProperties !== undefined ? 'object' : '')
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

        const {minimum, maximum} = getSchemaBounds(schema)
        if (minimum || maximum) {
            if (minimum && maximum && minimum.value === maximum.value && !minimum.exclusive && !maximum.exclusive) {
                result += `[${minimum.value}]`;
            } else {
                result += `${minimum?.exclusive ? '(' : '['}${minimum?.value ?? ''}..${maximum?.value ?? ''}${maximum?.exclusive ? ')' : ']'}`;
            }
        }

        return result
    }

    return type
}

export function unreference<T>(reference: string, components: Components): T|undefined {
    return resolveReference<T>({components}, {$ref: reference}).value
}

export function getOperationId (method: string, path: string, operation: Operation) {
    const operationId = operation.operationId ?? `${method.toLowerCase()}-${path.replace(/\//g, '-').replace(/\{/g, '').replace(/}/g, '')}`

    return 'operations/' + encodeURIComponent(operationId)
}

export function getOperationTitle (path: string, operation: Operation) {
    return operation.summary ?? operation.operationId ?? path
}

export function getWebhookOperations(document: Document, report?: (issue: ReferenceIssue) => void): InlineOperation[] {
    return Object.entries(document.webhooks ?? {}).filter(([name]) => !name.startsWith('x-')).flatMap(([name, item]) => {
        const result = resolveReference<PathItem>(document, item, 'pathItem')
        result.issues.forEach(issue => report?.(issue))
        const resolved = result.value
        if (!resolved) return []
        return getInlineOperations({[name]: resolved}, document, report).map(entry => ({
            ...entry,
            id: `webhooks/${encodeURIComponent(name)}/${entry.method}`,
            operation: {
                ...entry.operation,
                summary: entry.operation.summary ?? resolved.summary ?? name,
                description: entry.operation.description ?? resolved.description,
            },
        }))
    })
}

export function getInlineOperations (paths: Paths, document: Document = {paths}, report?: (issue: ReferenceIssue) => void): InlineOperation[] {
    return Object.entries(paths).reduce<InlineOperation[]>((acc, [path, item]) => {
        if (path.startsWith('x-')) return acc
        const result = resolveReference<PathItem>(document, item, 'pathItem')
        result.issues.forEach(issue => report?.(issue))
        const pathItem = result.value
        if (!pathItem) return acc
        return acc.concat(httpMethods.filter(method => pathItem[method]).map(method => {
            const operation = pathItem[method]!
            return {
                id: getOperationId(method, path, operation),
                method,
                path,
                operation: pathItem.parameters || operation.parameters ? {
                    ...operation,
                    parameters: effectiveParameters(pathItem.parameters, operation.parameters, document, report),
                } : operation,
            }
        }))
    }, [])
}
