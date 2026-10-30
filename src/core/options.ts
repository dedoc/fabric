type FabricOpenApiDocumentLink =
    | {
    openApiDocument: string | (() => Promise<string>),
    openApiDocumentUrl?: string,
}
    | {
    openApiDocument?: never,
    openApiDocumentUrl: string,
}

export type LogoImage = {
    src: string,
    /** Image for the dark theme; defaults to src. */
    srcDark?: string,
    /** Use an empty string when the visible title already names the brand. */
    alt: string,
    /** Displayed height in pixels; aspect ratio is preserved. Defaults to 36. */
    height?: number,
}

export type LogoConfig = {
    title?: string,
    image?: LogoImage,
    /** Omitted: selected API default page. false: no link. */
    href?: string | false,
    target?: '_self' | '_blank',
}

export type FabricOptions = FabricOpenApiDocumentLink & {
    /** Replaces spec branding. Omitted: use info.x-logo. false: hide branding. */
    logo?: LogoConfig | false,
    guides?: Record<string, string>,
    /** Show the overview page. Defaults to true; false opens the first guide or endpoint. */
    overview?: boolean,
    /** Show schema navigation and links. Defaults to true. */
    showSchemas?: boolean,
    referenceLabel?: boolean,
}
