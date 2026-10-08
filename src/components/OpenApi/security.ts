import type {Components, Document, Operation, SecurityScheme} from './types'

export function httpAuthKind(scheme?: SecurityScheme): 'basic' | 'bearer' | undefined {
  if (scheme?.type !== 'http') return undefined
  const kind = scheme.scheme.toLowerCase()
  return kind === 'basic' || kind === 'bearer' ? kind : undefined
}

export function resolveSecurityScheme(name: string, components: Components): SecurityScheme | undefined {
  let entry = components.securitySchemes?.[name]
  const seen = new Set<string>()
  while (entry && '$ref' in entry) {
    if (seen.has(entry.$ref)) return undefined
    seen.add(entry.$ref)
    const tokens = entry.$ref.split('/')
    if (tokens.length !== 4 || tokens.slice(0, 3).join('/') !== '#/components/securitySchemes') return undefined
    entry = components.securitySchemes?.[tokens[3].replace(/~1/g, '/').replace(/~0/g, '~')]
  }
  return entry
}

export function securitySchemeLabel(scheme?: SecurityScheme): string {
  if (!scheme) return 'Unresolved authentication scheme'
  if (scheme.type === 'apiKey') return 'API key'
  if (scheme.type === 'oauth2') return 'OAuth 2.0'
  if (scheme.type === 'openIdConnect') return 'OpenID Connect'
  if (scheme.scheme.toLowerCase() === 'basic') return 'Basic authentication'
  if (scheme.scheme.toLowerCase() === 'bearer') return 'Bearer token'
  return `HTTP ${scheme.scheme}`
}

export function operationSecurity(operation: Operation, document: Document) {
  const requirements = operation.security ?? document.security ?? []
  return requirements.map(requirement => Object.entries(requirement).map(([name, scopes]) => ({
    name,
    scopes,
    scheme: resolveSecurityScheme(name, document.components ?? {}),
  })))
}
