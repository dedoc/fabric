import type {Components, Document, Operation, SecurityScheme} from '@/core/openapi/types'
import {resolveReference} from '@/core/openapi/references'
import type {ReferenceIssue} from '@/core/openapi/references'

export function resolveSecurityScheme(name: string, components: Components, document: Document = {components}, report?: (issue: ReferenceIssue) => void): SecurityScheme | undefined {
  const token = encodeURIComponent(name.replace(/~/g, '~0').replace(/\//g, '~1'))
  const result = resolveReference<SecurityScheme>(document, {$ref: `#/components/securitySchemes/${token}`})
  result.issues.forEach(issue => report?.(issue))
  return result.value
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
    scheme: resolveSecurityScheme(name, document.components ?? {}, document),
  })))
}

export function authorizationHeaderExample(operation: Operation, document: Document): string | undefined {
  for (const group of operationSecurity(operation, document)) {
    if (group.length !== 1) continue
    const scheme = group[0].scheme
    const httpScheme = scheme?.type === 'http' ? scheme.scheme.toLowerCase() : undefined
    if (httpScheme === 'basic') return 'Basic <base64-credentials>'
    if (httpScheme === 'bearer' || scheme?.type === 'oauth2' || scheme?.type === 'openIdConnect') return 'Bearer <token>'
  }
}
