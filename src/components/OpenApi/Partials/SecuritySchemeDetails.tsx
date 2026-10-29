import {Fragment} from 'react'
import type {SecurityScheme} from '@/core/openapi/types'
import Description from '@/components/OpenApi/Description'
import {securitySchemeLabel} from '@/core/openapi/security'

export default function SecuritySchemeDetails({name, scheme, scopes}: {name: string; scheme?: SecurityScheme; scopes?: string[]}) {
  const httpScheme = scheme?.type === 'http' ? scheme.scheme.toLowerCase() : ''
  const oauthFlows = scheme?.type === 'oauth2' ? Object.entries(scheme.flows).map(([flowName, flow]) => {
    const labels: Record<string, string> = {authorizationCode: 'Authorization code', clientCredentials: 'Client credentials', implicit: 'Implicit', password: 'Password'}
    const scopeText = Object.entries(flow.scopes ?? {}).filter(([scope]) => scope.trim()).map(([scope, description]) => description.trim() ? `${scope} — ${description}` : scope).join('\n')
    return {name: flowName, rows: [{label: 'Flow', value: labels[flowName] ?? flowName}, {label: 'Authorization URL', value: flow.authorizationUrl}, {label: 'Token URL', value: flow.tokenUrl}, {label: 'Refresh URL', value: flow.refreshUrl}, {label: 'Scopes', value: scopeText}].filter(row => row.value?.trim())}
  }) : []
  const bearerFormat = scheme?.type === 'http' && httpScheme === 'bearer' ? scheme.bearerFormat?.trim() : undefined
  const requiredScopes = scopes?.filter(scope => scope.trim()) ?? []
  let discoveryUrl: string | undefined
  if (scheme?.type === 'openIdConnect' && scheme.openIdConnectUrl) {
    try { const url = new URL(scheme.openIdConnectUrl); if (['https:', 'http:'].includes(url.protocol)) discoveryUrl = url.href } catch {}
  }
  return <div className="min-w-0 space-y-1 text-sm leading-5 text-gray-700 dark:text-gray-300 [overflow-wrap:anywhere]">
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1"><h3 className="font-medium text-gray-900 dark:text-gray-100">{securitySchemeLabel(scheme)}</h3><div className="text-gray-500 dark:text-gray-400">{name}</div></div>
    {scheme?.description?.trim() && <Description className="leading-5" content={scheme.description} />}
    {httpScheme === 'basic' && <p className="text-pretty">Send an <code className="font-jetbrains-mono">Authorization</code> header with <code className="font-jetbrains-mono">Basic</code> followed by the Base64-encoded <code className="font-jetbrains-mono">username:password</code>.</p>}
    {scheme?.type === 'oauth2' && oauthFlows.map(flow => <dl key={flow.name} className="grid min-w-0 grid-cols-[7.5rem_minmax(0,1fr)] gap-x-3 gap-y-2 pt-2 text-xs leading-4">{flow.rows.map(row => <Fragment key={row.label}><dt className="text-gray-500 dark:text-gray-400">{row.label}</dt><dd className={`min-w-0 whitespace-pre-line ${row.label === 'Flow' ? '' : 'font-jetbrains-mono'}`}>{row.value}</dd></Fragment>)}</dl>)}
    {httpScheme === 'bearer' && bearerFormat && <dl className="grid min-w-0 grid-cols-[7.5rem_minmax(0,1fr)] gap-x-3 gap-y-2 pt-2 text-xs leading-4"><dt className="text-gray-500 dark:text-gray-400">Format</dt><dd className="min-w-0 font-jetbrains-mono">{bearerFormat}</dd></dl>}
    {scheme?.type === 'openIdConnect' && <p className="text-pretty">Send the access token in the <code className="font-jetbrains-mono">Authorization: Bearer &lt;token&gt;</code> header.</p>}
    {scheme?.type === 'apiKey' && <p className="text-pretty">Send your API key in the <code className="font-jetbrains-mono">{scheme.name}</code> {scheme.in === 'query' ? 'query parameter' : scheme.in}.</p>}
    {scheme?.type === 'http' && httpScheme !== 'bearer' && <p className="text-pretty">Use the {scheme.scheme} HTTP authentication scheme.</p>}
    {!scheme && <p className="text-pretty">This specification references an authentication scheme that could not be resolved. Check with the API provider for instructions.</p>}
    {!!requiredScopes.length && <dl className="grid min-w-0 grid-cols-[7.5rem_minmax(0,1fr)] gap-x-3 gap-y-2 pt-2 text-xs leading-4"><dt className="text-gray-500 dark:text-gray-400">Required scopes</dt><dd className="min-w-0"><ul role="list" className="flex flex-wrap gap-x-3 gap-y-1 text-gray-600 dark:text-gray-400">{requiredScopes.map(scope => <li key={scope}><code className="font-jetbrains-mono">{scope}</code></li>)}</ul></dd></dl>}
    {discoveryUrl && <p><a href={discoveryUrl} className="text-gray-600 dark:text-gray-400 underline underline-offset-4 hover:text-gray-900 hover:dark:text-gray-100" target="_blank" rel="noopener noreferrer">OpenID Connect configuration</a></p>}
  </div>
}
