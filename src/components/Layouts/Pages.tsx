import {useEffect, useMemo, useState} from 'react'
import type {Document, PathItem} from '@/core/openapi/types'
import {DocumentContext, ShowSchemasContext} from '@/react/context'
import {resolveReference} from '@/core/openapi/references'
import type {ReferenceIssue} from '@/core/openapi/references'
import ReferenceDiagnostics from '@/components/OpenApi/ReferenceDiagnostics'
import Paths from '@/components/OpenApi/Paths'
import SchemaPage from '@/components/OpenApi/SchemaPage'
import Overview from '@/components/OpenApi/Overview'
import ApiBrand from '@/components/OpenApi/ApiBrand'
import type {LogoConfig} from '@/types'
import Operation from '@/components/OpenApi/Operation'
import type {Navigation as NavigationType} from '@/components/Layouts/Partials/types'
import Navigation from '@/components/Layouts/Partials/Navigation'
import NavigationItem from '@/components/Layouts/Partials/NavigationItem'
import ThemeSwitch from '@/components/UI/ThemeSwitch'
import Button from '@/components/UI/Button'
import {getInlineOperations, getWebhookOperations, getOperationTitle} from '@/core/openapi/utils'
import type {InlineOperation} from '@/core/openapi/utils'
import {resolveOperationBase} from '@/core/openapi/servers'
import {parseGuides} from '@/core/guides'
import Description from '@/components/OpenApi/Description'
import {groupOperationsByTags, type OperationTagGroup} from '@/core/openapi/tags'
import SearchPalette from '@/components/Layouts/Partials/SearchPalette'
import {buildSearchEntries} from '@/core/search'

type Props = {
  base?: string
  documentUrl?: string
  document: Document
  guides?: Record<string, string>
  showSchemas?: boolean
  referenceLabel?: boolean
  logo?: LogoConfig | false
}

function getPageIdFromUrl(): string | undefined {
  const url = new URL(window.location.href)
  const id = url.hash.replace(/^#/, '')
  return id.startsWith('overview/') ? 'overview' : id
}

function buildNavigationTree(document: Document, operations: InlineOperation[], webhook = false, groupedGuides: ReturnType<typeof parseGuides> = []): NavigationType[] {
  const guideFolders: NavigationType[] = []
  for (const guide of groupedGuides) {
    if (!guide.group) continue
    let folder = guideFolders.find(item => item.type === 'folder' && item.name === guide.group)
    if (!folder) {
      folder = {id: `tag/${guide.group}`, type: 'folder', name: guide.group, children: []}
      guideFolders.push(folder)
    }
    if (folder.type === 'folder') folder.children.push({id: guide.id, type: 'guide', name: guide.title})
  }
  const entry = (operation: InlineOperation): NavigationType => ({
    id: operation.id,
    type: 'operation',
    name: getOperationTitle(operation.path, operation.operation),
    method: operation.method,
    webhook,
  })
  const usedGuides = new Set<NavigationType>()
  const folder = (group: OperationTagGroup): NavigationType => {
    const guides = guideFolders.find(item => item.name === (group.tag?.name ?? group.name))
    if (guides) usedGuides.add(guides)
    return {
      id: group.key,
      type: group.tag?.kind === 'nav-section' ? 'section' : 'folder',
      name: group.name,
      children: [...(guides?.type === 'folder' ? guides.children : []), ...group.operations.map(entry), ...group.children.map(folder)],
    }
  }
  const {groups, untagged} = groupOperationsByTags(document, operations)
  const folders = groups.map(folder)
  return [...guideFolders.filter(guide => !usedGuides.has(guide)), ...folders, ...untagged.map(entry)]
}

export default function Pages({base, documentUrl, document, guides: guideSources, showSchemas = true, referenceLabel = true, logo}: Props) {
  const [selectedPageId, setSelectedPageId] = useState<string | undefined>(() => getPageIdFromUrl() || 'overview')
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false)
  const paths = document.paths ?? {}
  const components = document.components ?? {}
  const navigation = useMemo(() => {
    const issues: ReferenceIssue[] = []
    const report = (issue: ReferenceIssue) => issues.push(issue)
    return {operations: getInlineOperations(paths, document, report), webhooks: getWebhookOperations(document, report), issues}
  }, [document, paths])
  const operations = navigation.operations
  const webhooks = navigation.webhooks
  const guides = useMemo(() => parseGuides(guideSources), [guideSources])
  const selectedGuide = guides.find(guide => guide.id === selectedPageId)
  const schemas = useMemo(() => Object.entries(components.schemas ?? {}).map(([name, schema]) => ({id: `schemas/${encodeURIComponent(name)}`, name, schema})), [components.schemas])
  const selectedSchema = showSchemas ? schemas.find(schema => schema.id === selectedPageId) : undefined
  const selectedOperation = selectedPageId ? operations.find(operation => operation.id === selectedPageId) : undefined
  const selectedWebhook = webhooks.find(item => item.id === selectedPageId)
  const operationBase = useMemo(() => {
    if (!selectedOperation) return ''
    return resolveOperationBase(
      document.servers ?? (base === undefined ? undefined : [{url: base}]),
      resolveReference<PathItem>(document, paths[selectedOperation.path], 'pathItem').value ?? {},
      selectedOperation.operation,
      documentUrl,
    )
  }, [selectedOperation, document.servers, document, base, paths, documentUrl])
  const introductionGuides = guides.filter(guide => !guide.group)
  const operationNavigation = useMemo(() => buildNavigationTree(document, operations, false, guides.filter(guide => guide.group)), [document, operations, guides])
  const webhookNavigation = useMemo(() => buildNavigationTree(document, webhooks, true), [document, webhooks])
  const searchEntries = useMemo(() => buildSearchEntries(document, operations, webhooks, guides, showSchemas), [document, operations, webhooks, guides, showSchemas])

  function handlePageSelect(pageId: string) {
    setSelectedPageId(pageId)
    window.history.pushState({}, '', `#${pageId}`)
    window.scrollTo(0, 0)
    setMobileNavigationOpen(false)
  }
  function syncLocation() {
    setSelectedPageId(getPageIdFromUrl() || 'overview')
    window.scrollTo(0, 0)
    setMobileNavigationOpen(false)
  }
  useEffect(() => {
    const desktopQuery = window.matchMedia('(min-width: 768px)')
    const closeMobileNavigation = () => setMobileNavigationOpen(false)
    desktopQuery.addEventListener('change', closeMobileNavigation)
    window.addEventListener('popstate', syncLocation)
    window.addEventListener('hashchange', syncLocation)
    return () => {
      desktopQuery.removeEventListener('change', closeMobileNavigation)
      window.removeEventListener('popstate', syncLocation)
      window.removeEventListener('hashchange', syncLocation)
    }
  }, [])

  return <DocumentContext.Provider value={document}>
    <ShowSchemasContext.Provider value={showSchemas}>
      <div className="isolate bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 [&_button:focus-visible]:outline [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-2 [&_button:focus-visible]:outline-gray-500 [&_select:focus-visible]:outline [&_select:focus-visible]:outline-2 [&_select:focus-visible]:outline-offset-2 [&_select:focus-visible]:outline-gray-500">
        <header className="sticky md:pt-2 top-0 z-30 flex h-16 w-full items-center gap-4 border-b border-[#eeeeef] dark:border-gray-800 bg-white dark:bg-gray-950 px-5 md:fixed md:h-14 md:w-[248px] md:gap-0 md:border-0 md:px-6 min-[1200px]:w-[296px]">
          <ApiBrand info={document.info} documentUrl={documentUrl} logo={logo} />
          <Button className="min-h-9 rounded-[--radius] border border-gray-950/10 dark:border-gray-700 px-3 py-2 text-sm md:hidden" aria-expanded={mobileNavigationOpen} aria-controls="docs-navigation" onClick={() => setMobileNavigationOpen(open => !open)}>
            {mobileNavigationOpen ? 'Close menu' : 'Menu'}
          </Button>
        </header>
        <div className="flex items-start md:min-h-dvh">
          <aside id="docs-navigation" className={`sticky top-16 h-[calc(100dvh-64px)] w-full shrink-0 overflow-hidden md:top-14 md:h-[calc(100dvh-56px)] md:w-[248px] min-[1200px]:w-[296px] ${mobileNavigationOpen ? 'max-md:fixed max-md:bottom-0 max-md:z-20 max-md:bg-white max-md:dark:bg-gray-950' : 'max-md:hidden'}`} onKeyDown={event => {if (event.key === 'Escape') setMobileNavigationOpen(false)}}>
            <div className="flex h-full flex-col overflow-y-auto [scrollbar-gutter:stable] overscroll-contain px-5 pt-4 md:px-6 md:pt-2">
              <div className="flex-1 shrink-0 pb-6">
                <SearchPalette entries={searchEntries} onNavigate={handlePageSelect} />
                <nav aria-label="Introduction" className="-mx-2 mb-6">
                  <NavigationItem label="Overview" href="#overview" active={selectedPageId === 'overview'} aria-current={selectedPageId === 'overview' ? 'page' : undefined} onClick={event => {event.preventDefault(); handlePageSelect('overview')}} />
                  {introductionGuides.map(guide => <NavigationItem key={guide.id} label={guide.title} href={`#${guide.id}`} active={selectedPageId === guide.id} aria-current={selectedPageId === guide.id ? 'page' : undefined} onClick={event => {event.preventDefault(); handlePageSelect(guide.id)}} />)}
                </nav>
                {referenceLabel && <div className="-mx-2 mb-3 px-2 text-[13px] font-medium">Reference</div>}
                <nav aria-label="API reference" className="-mx-2">
                  {operationNavigation.map(item => <Navigation key={item.id} navigation={item} selectedId={selectedPageId} onNavigate={handlePageSelect} />)}
                </nav>
                {webhooks.length > 0 && <>
                  <div className="-mx-2 mb-3 mt-6 px-2 text-[13px] font-medium">Webhooks</div>
                  <nav aria-label="Webhooks" className="-mx-2">
                    {webhookNavigation.map(item => <Navigation key={item.id} navigation={item} selectedId={selectedPageId} onNavigate={handlePageSelect} />)}
                  </nav>
                </>}
                {showSchemas && schemas.length > 0 && <>
                  <div className="-mx-2 mb-3 mt-6 px-2 text-[13px] font-medium">Schemas</div>
                  <nav aria-label="Schemas" className="-mx-2">
                    {schemas.map(item => <NavigationItem key={item.id} label={item.name} active={item.id === selectedPageId} aria-current={item.id === selectedPageId ? 'page' : undefined} title={item.name} onClick={() => handlePageSelect(item.id)} />)}
                  </nav>
                </>}
              </div>
              <div className="sticky bottom-0 z-10 -mx-5 flex shrink-0 items-center gap-1 bg-white dark:bg-gray-950 px-5 pb-4 pt-2 text-xs text-gray-500 dark:text-gray-400 md:-mx-6 md:px-6">
                <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-full h-6 bg-gradient-to-t from-white dark:from-gray-950 to-transparent" />
                <span>Powered by</span>
                <a href="https://scramble.dedoc.co/?utm_source=fabric" target="_blank" rel="noopener noreferrer" className="inline-flex items-center font-semibold text-gray-900 dark:text-gray-100 hover:text-gray-600 dark:hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500">Scramble</a>
                <ThemeSwitch className="ml-auto" />
              </div>
            </div>
          </aside>
          <main inert={mobileNavigationOpen} className="min-w-0 flex-1 px-5 pb-12 pt-6 md:px-6 md:pb-20 md:pt-8 min-[1200px]:px-8 min-[1600px]:max-w-[1400px]">
            <ReferenceDiagnostics issues={navigation.issues} />
            {selectedPageId === 'overview' && <Overview document={document} paths={paths} components={components} documentUrl={documentUrl} onNavigate={handlePageSelect} />}
            {selectedGuide && <article key={selectedGuide.id} className="guide mx-auto grid min-w-0 max-w-[72ch] grid-cols-1 gap-4 pt-6 [overflow-wrap:anywhere]">
              <h1 className="text-balance text-[clamp(2rem,4vw,3rem)] font-medium tracking-tight">{selectedGuide.title}</h1>
              <Description content={selectedGuide.content} className="max-w-[70ch]" />
            </article>}
            {selectedSchema && <SchemaPage key={selectedSchema.id} name={selectedSchema.name} schema={selectedSchema.schema} components={components} />}
            {selectedWebhook && <article key={selectedWebhook.id} className="min-w-0 [overflow-wrap:anywhere]">
              <Operation webhook webhookName={selectedWebhook.path} base="https://your-app.example" path={`/webhooks/${encodeURIComponent(selectedWebhook.path)}`} method={selectedWebhook.method} operation={selectedWebhook.operation} components={components} />
            </article>}
            {selectedOperation && <div key={selectedOperation.id}>
              <article className="min-w-0 [overflow-wrap:anywhere]">
                <Paths base={operationBase} components={components} paths={{[selectedOperation.path]: {[selectedOperation.method]: selectedOperation.operation}}} />
              </article>
            </div>}
          </main>
        </div>
      </div>
    </ShowSchemasContext.Provider>
  </DocumentContext.Provider>
}
