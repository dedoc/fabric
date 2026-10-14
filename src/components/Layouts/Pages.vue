<script setup lang="ts">
import type {Document} from "../OpenApi/types.ts";
import {computed, onMounted, onUnmounted, provide, ref} from "vue";
import {documentKey, showSchemasKey} from "../../utils/symbols.ts";
import {resolveReference} from '../OpenApi/references'
import type {ReferenceIssue} from '../OpenApi/references'
import type {PathItem} from '../OpenApi/types'
import ReferenceDiagnostics from '../OpenApi/ReferenceDiagnostics.vue'
import Paths from "../OpenApi/Paths.vue";
import SchemaPage from "../OpenApi/SchemaPage.vue";
import Overview from "../OpenApi/Overview.vue";
import ApiBrand from '../OpenApi/ApiBrand.vue'
import Operation from "../OpenApi/Operation.vue";
import {Navigation as NavigationType} from "./Partials/types.ts";
import Navigation from "./Partials/Navigation.vue";
import NavigationItem from "./Partials/NavigationItem.vue";
import ThemeSwitch from '../UI/ThemeSwitch.vue'
import {getInlineOperations, getWebhookOperations, getOperationTitle, InlineOperation} from "../OpenApi/utils.ts";
import {resolveOperationBase} from "../OpenApi/servers.ts";
import {parseGuides} from '../../guides'
import Description from '../OpenApi/Description.vue'
import {groupOperationsByTags, type OperationTagGroup} from '../OpenApi/tags'
import SearchPalette from './Partials/SearchPalette.vue'
import {buildSearchEntries} from './search'

const props = withDefaults(defineProps<{
  base?: string,
  documentUrl?: string,
  document: Document,
  guides?: Record<string, string>,
  showSchemas?: boolean,
  referenceLabel?: boolean,
}>(), {showSchemas: true, referenceLabel: true})

provide(showSchemasKey, computed(() => props.showSchemas))
const sourceDocument = computed(() => props.document)
const paths = computed(() => props.document.paths ?? {})
const components = computed(() => props.document.components ?? {})
provide(documentKey, sourceDocument)

const navigation = computed(() => {
  const issues: ReferenceIssue[] = []
  const report = (issue: ReferenceIssue) => issues.push(issue)
  return {operations: getInlineOperations(paths.value, sourceDocument.value, report), webhooks: getWebhookOperations(sourceDocument.value, report), issues}
})
const operations = computed(() => navigation.value.operations)
const webhooks = computed(() => navigation.value.webhooks)
const selectedWebhook = computed(() => webhooks.value.find(item => item.id === selectedPageId.value))

function getPageIdFromUrl (): string|undefined {
  const url = new URL(window.location.href)
  const id = url.hash.replace(/^#/, '')
  return id.startsWith('overview/') ? 'overview' : id
}

const selectedPageId = ref<string|undefined>(getPageIdFromUrl() || 'overview')
const guides = computed(() => parseGuides(props.guides))
const selectedGuide = computed(() => guides.value.find(guide => guide.id === selectedPageId.value))

const schemas = computed(() => Object.entries(components.value.schemas ?? {}).map(([name, schema]) => ({
  id: `schemas/${encodeURIComponent(name)}`,
  name,
  schema,
})))
const selectedSchema = computed(() => props.showSchemas ? schemas.value.find(schema => schema.id === selectedPageId.value) : undefined)

const selectedOperation = computed<InlineOperation|undefined>(() => {
  const operationId = selectedPageId.value
  if (! operationId) {
    return undefined
  }
  return operations.value.find(op => op.id === operationId)
})

const operationBase = computed(() => {
  const selected = selectedOperation.value
  if (!selected) return ''
  return resolveOperationBase(
    props.document.servers ?? (props.base === undefined ? undefined : [{url: props.base}]),
    resolveReference<PathItem>(sourceDocument.value, paths.value[selected.path], 'pathItem').value ?? {}, selected.operation, props.documentUrl,
  )
})

function handlePageSelect (pageId: string) {
  selectedPageId.value = pageId

  // push to history
  window.history.pushState({}, '', `#${pageId}`)

  // reset scroll
  window.scrollTo(0, 0)
  mobileNavigationOpen.value = false
}

function buildNavigationTree (operations: InlineOperation[], webhook = false, groupedGuides: ReturnType<typeof parseGuides> = []): NavigationType[] {
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
    id: operation.id, type: 'operation', name: getOperationTitle(operation.path, operation.operation), method: operation.method, webhook,
  })
  const usedGuides = new Set<NavigationType>()
  const folder = (group: OperationTagGroup): NavigationType => {
    const guides = guideFolders.find(item => item.name === (group.tag?.name ?? group.name))
    if (guides) usedGuides.add(guides)
    return {
      id: group.key, type: group.tag?.kind === 'nav-section' ? 'section' : 'folder', name: group.name,
      children: [...(guides?.type === 'folder' ? guides.children : []), ...group.operations.map(entry), ...group.children.map(folder)],
    }
  }
  const {groups, untagged} = groupOperationsByTags(props.document, operations)
  const folders = groups.map(folder)
  return [...guideFolders.filter(guide => !usedGuides.has(guide)), ...folders, ...untagged.map(entry)]
}

const mobileNavigationOpen = ref(false)
const introductionGuides = computed(() => guides.value.filter(guide => !guide.group))
const operationNavigation = computed(() => buildNavigationTree(operations.value, false, guides.value.filter(guide => guide.group)))
const webhookNavigation = computed(() => buildNavigationTree(webhooks.value, true))
const searchEntries = computed(() => buildSearchEntries(props.document, operations.value, webhooks.value, guides.value, props.showSchemas))
function syncLocation() {
  selectedPageId.value = getPageIdFromUrl() || 'overview'
  window.scrollTo(0, 0)
  mobileNavigationOpen.value = false
}
let desktopQuery: MediaQueryList | undefined
function closeMobileNavigation() {
  mobileNavigationOpen.value = false
}
onMounted(() => {
  desktopQuery = window.matchMedia('(min-width: 768px)')
  desktopQuery.addEventListener('change', closeMobileNavigation)
  window.addEventListener('popstate', syncLocation)
  window.addEventListener('hashchange', syncLocation)
})
onUnmounted(() => {
  desktopQuery?.removeEventListener('change', closeMobileNavigation)
  window.removeEventListener('popstate', syncLocation)
  window.removeEventListener('hashchange', syncLocation)
})
</script>

<template>
  <div class="isolate bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 [&_button:focus-visible]:outline [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-2 [&_button:focus-visible]:outline-gray-500 [&_select:focus-visible]:outline [&_select:focus-visible]:outline-2 [&_select:focus-visible]:outline-offset-2 [&_select:focus-visible]:outline-gray-500">
    <header class="sticky top-0 z-30 flex h-16 w-full items-center gap-4 border-b border-[#eeeeef] dark:border-gray-800 bg-white dark:bg-gray-950 px-5 md:fixed md:h-14 md:w-[248px] md:gap-0 md:border-0 md:px-6 min-[1200px]:w-[296px]">
      <ApiBrand :info="document.info" :document-url="documentUrl" />
      <button type="button" class="min-h-9 rounded-[--radius] border border-gray-950/10 dark:border-gray-700 px-3 py-2 text-sm md:hidden" :aria-expanded="mobileNavigationOpen" aria-controls="docs-navigation" @click="mobileNavigationOpen = !mobileNavigationOpen">
        {{ mobileNavigationOpen ? 'Close menu' : 'Menu' }}
      </button>
    </header>
    <div class="flex items-start md:min-h-dvh">
      <aside id="docs-navigation" class="sticky top-16 h-[calc(100dvh-64px)] w-full shrink-0 overflow-hidden md:top-14 md:h-[calc(100dvh-56px)] md:w-[248px] min-[1200px]:w-[296px]" :class="mobileNavigationOpen ? 'max-md:fixed max-md:bottom-0 max-md:z-20 max-md:bg-white max-md:dark:bg-gray-950' : 'max-md:hidden'" @keydown.esc="mobileNavigationOpen = false">
        <div class="flex h-full flex-col overflow-y-auto [scrollbar-gutter:stable] overscroll-contain px-5 pt-4 md:px-6 md:pt-2">
        <div class="flex-1 shrink-0 pb-6">
        <SearchPalette :entries="searchEntries" @navigate="handlePageSelect" />
        <nav aria-label="Introduction" class="-mx-2 mb-6">
          <NavigationItem label="Overview" href="#overview" :active="selectedPageId === 'overview'" :aria-current="selectedPageId === 'overview' ? 'page' : undefined" @click.prevent="handlePageSelect('overview')" />
          <NavigationItem v-for="guide of introductionGuides" :key="guide.id" :label="guide.title" :href="`#${guide.id}`" :active="selectedPageId === guide.id" :aria-current="selectedPageId === guide.id ? 'page' : undefined" @click.prevent="handlePageSelect(guide.id)" />
        </nav>
        <div v-if="referenceLabel" class="-mx-2 mb-3 px-2 text-[13px] font-medium">Reference</div>
        <nav aria-label="API reference" class="-mx-2">
          <Navigation v-for="item of operationNavigation" :key="item.id" :navigation="item" :selected-id="selectedPageId" @navigate="handlePageSelect" />
        </nav>
        <template v-if="webhooks.length">
          <div class="-mx-2 mb-3 mt-6 px-2 text-[13px] font-medium">Webhooks</div>
          <nav aria-label="Webhooks" class="-mx-2">
            <Navigation v-for="item of webhookNavigation" :key="item.id" :navigation="item" :selected-id="selectedPageId" @navigate="handlePageSelect" />
          </nav>
        </template>
        <template v-if="showSchemas && schemas.length">
          <div class="-mx-2 mb-3 mt-6 px-2 text-[13px] font-medium">Schemas</div>
          <nav aria-label="Schemas" class="-mx-2">
            <NavigationItem v-for="item of schemas" :key="item.id" :label="item.name" :active="item.id === selectedPageId" :aria-current="item.id === selectedPageId ? 'page' : undefined" :title="item.name" @click="handlePageSelect(item.id)" />
          </nav>
        </template>
        </div>
        <div class="sticky bottom-0 z-10 -mx-5 flex shrink-0 items-center gap-1 bg-white dark:bg-gray-950 px-5 pb-4 pt-2 text-xs text-gray-500 dark:text-gray-400 md:-mx-6 md:px-6">
          <div aria-hidden="true" class="pointer-events-none absolute inset-x-0 bottom-full h-6 bg-gradient-to-t from-white dark:from-gray-950 to-transparent"></div>
          <span>Powered by</span>
          <a href="https://dedoc.co/?utm_source=fabric" target="_blank" rel="noopener noreferrer" class="inline-flex items-center font-semibold text-gray-900 dark:text-gray-100 hover:text-gray-600 dark:hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500">fabric</a>
          <ThemeSwitch />
        </div>
        </div>
      </aside>
      <main :inert="mobileNavigationOpen" class="min-w-0 flex-1 px-5 pb-12 pt-6 md:px-6 md:pb-20 md:pt-8 min-[1200px]:px-8 min-[1600px]:max-w-[1400px]">
        <ReferenceDiagnostics :issues="navigation.issues" />
        <Overview v-if="selectedPageId === 'overview'" :document="sourceDocument" :paths="paths" :components="components" :document-url="documentUrl" @navigate="handlePageSelect" />
        <article v-if="selectedGuide" :key="selectedGuide.id" class="guide mx-auto grid min-w-0 max-w-[72ch] grid-cols-1 gap-4 pt-6 [overflow-wrap:anywhere]">
          <h1 class="text-balance text-[clamp(2rem,4vw,3rem)] font-medium tracking-tight">{{ selectedGuide.title }}</h1>
          <Description :content="selectedGuide.content" class="max-w-[70ch]" />
        </article>
        <SchemaPage v-if="selectedSchema" :key="selectedSchema.id" :name="selectedSchema.name" :schema="selectedSchema.schema" :components="components" />
        <article v-if="selectedWebhook" :key="selectedWebhook.id" class="min-w-0 [overflow-wrap:anywhere]">
          <Operation webhook :webhook-name="selectedWebhook.path" base="https://your-app.example" :path="`/webhooks/${encodeURIComponent(selectedWebhook.path)}`" :method="selectedWebhook.method" :operation="selectedWebhook.operation" :components="components" />
        </article>
        <div v-if="selectedOperation" :key="selectedOperation.id">
          <article class="min-w-0 [overflow-wrap:anywhere]">
            <Paths :base="operationBase" :components="components" :paths="{[selectedOperation.path]: {[selectedOperation.method]: selectedOperation.operation}}" />
          </article>
        </div>
      </main>
    </div>
  </div>
</template>
