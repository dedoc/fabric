import {ArrowRightIcon} from '@/components/Icons'
import type {Components, Document, Paths, Server, PathItem} from '@/core/openapi/types'
import Description from '@/components/OpenApi/Description'
import SectionTitle from '@/components/OpenApi/Partials/SectionTitle'
import {getInlineOperations} from '@/core/openapi/utils'
import {resolveSecurityScheme} from '@/core/openapi/security'
import SecuritySchemeDetails from '@/components/OpenApi/Partials/SecuritySchemeDetails'
import {resolveOperationBase} from '@/core/openapi/servers'
import {resolveReference} from '@/core/openapi/references'
import type {ReferenceIssue} from '@/core/openapi/references'
import ReferenceDiagnostics from '@/components/OpenApi/ReferenceDiagnostics'
import {groupOperationsByTags, tagGroupOperations} from '@/core/openapi/tags'

export default function Overview({document, paths, components, documentUrl, onNavigate}: {document: Document; paths: Paths; components: Components; documentUrl?: string; onNavigate: (id: string) => void}) {
  const info = document.info
  const operations = getInlineOperations(paths, document)
  const declared: Server[] = [...(document.servers?.length ? document.servers : [{url: '/'}])]
  for (const pathItem of Object.values(paths)) declared.push(...(resolveReference<PathItem>(document, pathItem, 'pathItem').value?.servers ?? []))
  for (const {operation} of operations) declared.push(...(operation.servers ?? []))
  const seen = new Set<string>()
  const servers = declared.flatMap(server => {
    const url = resolveOperationBase([server], {}, {}, documentUrl)
    if (seen.has(url)) return []
    seen.add(url)
    return [{url, description: server.description}]
  })
  const schemes = Object.keys(components.securitySchemes ?? {}).map(name => {
    const issues: ReferenceIssue[] = []
    return {name, scheme: resolveSecurityScheme(name, components, document, issue => issues.push(issue)), issues}
  })
  const {groups, untagged} = groupOperationsByTags(document, operations)
  const entries = groups.map(group => {
    const taggedOperations = tagGroupOperations(group)
    return {key: group.key, name: group.name, id: taggedOperations[0]!.id, count: taggedOperations.length, description: group.tag?.description, externalDocs: group.tag?.externalDocs}
  })
  if (untagged.length) entries.push({key: 'untagged', name: 'Endpoints', id: untagged[0]!.id, count: untagged.length, description: undefined, externalDocs: undefined})
  function link(value?: string): string | undefined {
    if (!value) return undefined
    try { const result = new URL(value, documentUrl); return ['https:', 'http:'].includes(result.protocol) ? result.href : undefined } catch { return undefined }
  }
  const resources = [
    {label: document.externalDocs?.description || 'Documentation', url: link(document.externalDocs?.url)},
    {label: info?.contact?.name || 'Support', url: link(info?.contact?.url)},
    {label: 'Terms of service', url: link(info?.termsOfService)},
  ].filter((resource): resource is {label: string; url: string} => !!resource.url)
  const hasDetails = !!(info?.version || document.openapi || resources.length || info?.contact?.email || info?.license)
  return <article className="overview mx-auto grid min-w-0 max-w-[72ch] grid-cols-1 gap-10 pt-6 [overflow-wrap:anywhere]">
    <div className="contents"><header className="space-y-4 pb-6"><p className="text-sm font-medium text-gray-500 dark:text-gray-400">{info?.title || 'API documentation'}</p><h1 className="text-balance text-[clamp(2rem,4vw,3rem)] font-medium tracking-tight">Overview</h1>{info?.summary && <p className="prose max-w-[70ch]">{info.summary}</p>}{info?.description && <Description className="max-w-[70ch]" content={info.description} />}{!info?.description && !info?.summary && <p className="prose max-w-[70ch]">Explore {info?.title ? `the ${info.title}` : 'the API'}. Find server URLs, authentication details, and endpoint documentation below.</p>}</header>
      <section aria-labelledby="overview-servers" className="space-y-4 border-t border-gray-950/10 dark:border-gray-700 pt-7"><SectionTitle id="overview-servers">{servers.length > 1 ? 'Servers' : 'Base URL'}</SectionTitle><ul role="list" className="divide-y divide-gray-950/5 dark:divide-gray-700">{servers.map(server => <li key={server.url} className="space-y-1 py-3">{server.description && <Description content={server.description} />}<div className="text-sm text-gray-900 dark:text-gray-100"><code className="font-jetbrains-mono">{server.url}</code></div></li>)}</ul>{servers.length > 1 && <p className="text-pretty text-sm text-gray-500 dark:text-gray-400">Each endpoint shows the server it uses.</p>}</section>
      {!!schemes.length && <section aria-labelledby="overview-auth" className="space-y-4 border-t border-gray-950/10 dark:border-gray-700 pt-7"><SectionTitle id="overview-auth">Authentication</SectionTitle><p className="text-pretty text-sm text-gray-600 dark:text-gray-400">Check each endpoint for its authentication requirements.</p><div className="divide-y divide-gray-950/5 dark:divide-gray-700">{schemes.map(({name, scheme, issues}) => <div key={name} className="space-y-3 py-4 first:pt-0 last:pb-0"><ReferenceDiagnostics issues={issues} /><SecuritySchemeDetails name={name} scheme={scheme} /></div>)}</div></section>}
      {!!entries.length && <section aria-labelledby="overview-reference" className="space-y-4 border-t border-gray-950/10 dark:border-gray-700 pt-7"><SectionTitle id="overview-reference">Explore the API</SectionTitle><ul role="list" className="divide-y divide-gray-950/5 dark:divide-gray-700">{entries.map(group => <li key={group.key} className="py-3"><a href={`#${group.id}`} className="block text-base text-gray-900 dark:text-gray-100 hover:text-gray-500 hover:dark:text-gray-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500 sm:text-sm" onClick={event => {event.preventDefault(); onNavigate(group.id)}}><div className="flex items-baseline justify-between gap-4"><div className="min-w-0 font-medium">{group.name}</div><div className="shrink-0 tabular-nums text-gray-500 dark:text-gray-400">{group.count} {group.count === 1 ? 'endpoint' : 'endpoints'} <ArrowRightIcon /></div></div>{group.description && <Description content={group.description} className="mt-1" />}</a>{link(group.externalDocs?.url) && <a href={link(group.externalDocs?.url)} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm underline underline-offset-4">{group.externalDocs?.description || 'Documentation'}</a>}</li>)}</ul></section>}
    </div>
    {hasDetails && <aside aria-label="API details" className="min-w-0 border-t border-gray-950/10 dark:border-gray-700 pt-6"><h2 className="text-base font-medium text-gray-900 dark:text-gray-100 sm:text-sm">API details</h2><dl className="mt-5 flex flex-wrap gap-x-12 gap-y-6 text-sm">{info?.version && <div className="space-y-1"><dt className="font-medium text-gray-900 dark:text-gray-100">Version</dt><dd className="tabular-nums text-gray-500 dark:text-gray-400">{info.version}</dd></div>}{document.openapi && <div className="space-y-1"><dt className="font-medium text-gray-900 dark:text-gray-100">Specification</dt><dd className="text-gray-500 dark:text-gray-400">OpenAPI {document.openapi}</dd></div>}{info?.license && <div className="space-y-1"><dt className="font-medium text-gray-900 dark:text-gray-100">License</dt><dd className="text-gray-500 dark:text-gray-400">{link(info.license.url) ? <a href={link(info.license.url)} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-gray-900 hover:dark:text-gray-100">{info.license.name}</a> : info.license.name}</dd></div>}</dl>{(resources.length || info?.contact?.email) && <ul role="list" className="mt-6 space-y-3 border-t border-gray-950/10 dark:border-gray-700 pt-5 text-sm text-gray-600 dark:text-gray-400">{resources.map(resource => <li key={resource.url}><a href={resource.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-gray-900 hover:dark:text-gray-100">{resource.label}</a></li>)}{info?.contact?.email && <li><a href={`mailto:${encodeURIComponent(info.contact.email)}`} className="underline underline-offset-4 hover:text-gray-900 hover:dark:text-gray-100">{info.contact.email}</a></li>}</ul>}</aside>}
  </article>
}
