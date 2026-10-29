import type {Operation, PathItem, Server} from '@/core/openapi/types'

/** The most local server list replaces the inherited list. */
export function resolveOperationBase(
  servers: Server[] | undefined,
  pathItem: PathItem,
  operation: Operation,
  documentUrl?: string,
): string {
  const server = (operation.servers ?? pathItem.servers ?? servers)?.[0]
  const url = server
    ? server.url.replace(/\{([^{}]+)\}/g, (placeholder, name) => server.variables?.[name]?.default ?? placeholder)
    : '/'
  // Relative server URLs are relative to the original spec, including when fetched through a proxy.
  return documentUrl ? new URL(url, documentUrl).href : url
}
