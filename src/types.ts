type FabricOpenApiDocumentLink =
    | {
    openApiDocument: string | (() => Promise<string>),
    openApiDocumentUrl?: string,
}
    | {
    openApiDocument?: never,
    openApiDocumentUrl: string,
}

export type FabricOptions = FabricOpenApiDocumentLink & {
    guides?: Record<string, string>,
}
