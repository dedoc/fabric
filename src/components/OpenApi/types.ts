export type Schema = {
    allOf?: Schema[],
    title?: string,
    $ref?: string,
    type?: string|string[],
    properties?: {
        [name: string]: Schema,
    },
    items?: Schema,
    description?: string,
    default?: any,
    // @deprecated use examples instead
    example?: any,
    examples?: (string|Example)[],
    required?: string[],
    format?: string,
    // string specific attributes
    minLength?: number,
    maxLength?: number,
    // number specific attributes
    minimum?: number,
    maximum?: number,
    // properties that are hidden by default
    'x-hiddenProperties'?: string[]
}

export type Example = {
    summary?: string,
    description?: string,
    value?: any,
}

export type MediaType = {
    schema?: Schema,
}

export type RequestBody = {
    description?: string,
    content?: Record<string, MediaType>,
    required?: boolean, // not used by scramble - but should, by the way
}

export type Responses = {
    [statusCode: string]: Response|Reference,
}

export type Response = {
    description: string,
    content?: Record<string, MediaType>,
}

export type Reference = {
    $ref: string,
}

export type Operation = {
    summary?: string,
    description?: string,
    operationId?: string,
    tags?: string[], // @todo may be tag objects as well
    parameters?: (Reference|Parameter)[],
    requestBody?: RequestBody,
    responses?: Responses,
}

export type Parameter = {
    name: string,
    in: 'query'|'path'|'header'|'cookie',
    description?: string,
    required?: boolean,
    deprecated?: boolean,
    allowEmptyValue?: boolean,
    schema?: Schema,
}

export type PathItem = {
    post?: Operation,
}

export type Paths = {
    [path: string]: PathItem,
}

export type Components = {
    schemas?: {
        [name: string]: Schema,
    },
}
