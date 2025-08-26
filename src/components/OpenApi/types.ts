export type Schema = {
    allOf?: Schema[],
    title?: string,
    $ref?: string,
    type?: string|string[],
    properties?: {
        [name: string]: Schema,
    },
    enum?: any[],
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
    externalValue?: string,
}

export type Encoding = {
    contentType?: string,
    headers?: { [name: string]: Header|Reference },
}

export type MediaType = {
    schema?: Schema,
    example?: any,
    examples?: { [name: string]: Example|Reference },
    encoding?: { [name: string]: Encoding },
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
    headers?: Record<string, Header|Reference>,
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
    security?: SecurityRequirement[],
    responses?: Responses,
}

export type SecurityRequirement = Record<string, string[]>

export type Parameter = {
    name: string,
    in: 'query'|'path'|'header'|'cookie',
    description?: string,
    required?: boolean,
    deprecated?: boolean,
    allowEmptyValue?: boolean,
    schema?: Schema,
}

export type Header = {
    description?: string,
    required?: boolean,
    deprecated?: boolean,
} & ({
    style?: string,
    explode?: string,
    schema?: Schema,
    example?: any,
    examples?: { [name: string]: Example|Reference },
} | {
    content?: { [name: string]: MediaType },
})

export type PathItem = {
    post?: Operation,
}

export type Paths = {
    [path: string]: PathItem,
}

export type OAuthFlow = {
    authorizationUrl?: string,
    tokenUrl?: string,
    refreshUrl?: string,
    scopes: { [name: string]: string },
}

export type OAuthFlows = {
    implicit?: OAuthFlow,
    password?: OAuthFlow,
    clientCredentials?: OAuthFlow,
    authorizationCode?: OAuthFlow,
}

export type SecurityScheme = {
    description?: string,
} & ({
    type: 'apiKey',
    name: string,
    in: 'query'|'header'|'cookie',
} | {
    type: 'http',
    scheme: string,
    bearerFormat?: string,
} | {
    type: 'oauth2',
    flows: OAuthFlows,
} | {
    type: 'openIdConnect',
    openIdConnectUrl?: string,
})

export type Components = {
    schemas?: { [name: string]: Schema },
    responses?: { [name: string]: Response|Reference },
    parameters?: { [name: string]: Parameter|Reference },
    examples?: { [name: string]: Example|Reference },
    requestBodies?: { [name: string]: RequestBody|Reference },
    headers?: { [name: string]: Header|Reference },
    securitySchemes?: { [name: string]: SecurityScheme|Reference },
    links?: { [name: string]: any|Reference },
    callbacks?: { [name: string]: any|Reference },
    pathItems?: { [name: string]: any|PathItem },
}

export type Document = {
    security?: SecurityRequirement[],
    components?: Components,
}
