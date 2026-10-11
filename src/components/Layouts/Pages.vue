<script setup lang="ts">
import type {Components, Paths as PathsType} from "../OpenApi/types.ts";
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

const props = withDefaults(defineProps<{
  base?: string,
  documentUrl?: string,
  document: any, // todo: should not be here!
  components: Components, // todo: should not be here!
  paths: PathsType,
  showSchemas?: boolean,
}>(), {showSchemas: true})

provide(showSchemasKey, computed(() => props.showSchemas))
const sourceDocument = computed(() => ({...props.document, paths: props.paths, components: props.components}))
provide(documentKey, sourceDocument)

const navigation = computed(() => {
  const issues: ReferenceIssue[] = []
  const report = (issue: ReferenceIssue) => issues.push(issue)
  return {operations: getInlineOperations(props.paths, sourceDocument.value, report), webhooks: getWebhookOperations(sourceDocument.value, report), issues}
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

const schemas = computed(() => Object.entries(props.components.schemas ?? {}).map(([name, schema]) => ({
  id: `schemas/${encodeURIComponent(name)}`,
  name,
  schema,
})))
const filteredSchemas = computed(() => schemas.value.filter(({name, schema}) =>
  `${name} ${schema.title ?? ''}`.toLowerCase().includes(search.value.toLowerCase())
))
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
    resolveReference<PathItem>(sourceDocument.value, props.paths[selected.path], 'pathItem').value ?? {}, selected.operation, props.documentUrl,
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

// get the navigation tree using the first tag of the operation as a folder name
function buildNavigationTree (operations: InlineOperation[]): NavigationType[] {
  const tree = operations.reduce<NavigationType[]>((acc, operation) => {
    const folder = operation.operation.tags?.[0]
    if (! folder) {
      // add to the end
      acc.push({
        id: operation.id,
        type: 'operation',
        name: getOperationTitle(operation.path, operation.operation),
        method: operation.method,
      })

      return acc
    }

    let folderNavigation = acc.find(nav => nav.id === folder && nav.type === 'folder')
    if (! folderNavigation) {
      folderNavigation = {
        id: folder,
        type: 'folder',
        name: folder,
        children: [],
      }
      acc.push(folderNavigation)
    }

    if (folderNavigation.type !== 'folder') return acc

    folderNavigation.children.push({
      id: operation.id,
      type: 'operation',
      name: getOperationTitle(operation.path, operation.operation),
      method: operation.method,
    })

    return acc
  }, [])
  const tagOrder = new Map<string, number>((props.document.tags ?? []).map((tag: {name: string}, index: number) => [tag.name, index]))
  const rank = (item: NavigationType) => item.type === 'folder' ? tagOrder.get(item.name) ?? tagOrder.size : tagOrder.size
  return tree.sort((a, b) => rank(a) - rank(b))
}

const mobileNavigationOpen = ref(false)
const search = ref('')
const filteredNavigation = computed(() => buildNavigationTree(operations.value.filter(operation =>
  `${getOperationTitle(operation.path, operation.operation)} ${operation.path} ${operation.operation.tags?.join(' ') ?? ''}`
    .toLowerCase().includes(search.value.toLowerCase())
)))
const filteredWebhooks = computed(() => buildNavigationTree(webhooks.value.filter(operation =>
  `${getOperationTitle(operation.path, operation.operation)} ${operation.path} ${operation.operation.tags?.join(' ') ?? ''}`
    .toLowerCase().includes(search.value.toLowerCase())
)))
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
      <button type="button" class="min-h-9 rounded-md border border-gray-950/10 dark:border-gray-700 px-3 py-2 text-sm md:hidden" :aria-expanded="mobileNavigationOpen" aria-controls="docs-navigation" @click="mobileNavigationOpen = !mobileNavigationOpen">
        {{ mobileNavigationOpen ? 'Close menu' : 'Menu' }}
      </button>
    </header>
    <div class="flex items-start md:min-h-dvh">
      <aside id="docs-navigation" class="sticky top-16 h-[calc(100dvh-64px)] w-full shrink-0 overflow-hidden md:top-14 md:h-[calc(100dvh-56px)] md:w-[248px] min-[1200px]:w-[296px]" :class="mobileNavigationOpen ? 'max-md:fixed max-md:bottom-0 max-md:z-20 max-md:bg-white max-md:dark:bg-gray-950' : 'max-md:hidden'" @keydown.esc="mobileNavigationOpen = false">
        <div class="flex h-full flex-col overflow-y-auto [scrollbar-gutter:stable] overscroll-contain px-5 pt-4 md:px-6 md:pt-2">
        <div class="flex-1 shrink-0 pb-6">
        <label class="mb-6 flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-800 px-2.5 py-2 text-gray-500 dark:text-gray-400 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-gray-500">
          <svg class="size-4 shrink-0" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor"/><path d="m13 13 4 4" stroke="currentColor"/></svg>
          <input class="min-w-0 w-full bg-transparent text-base outline-none sm:text-sm" v-model="search" name="reference-search" type="search" placeholder="Search reference…" aria-label="Search reference">
        </label>
        <nav aria-label="Introduction" class="-mx-2 mb-6">
          <NavigationItem label="Overview" href="#overview" :active="selectedPageId === 'overview'" :aria-current="selectedPageId === 'overview' ? 'page' : undefined" @click.prevent="handlePageSelect('overview')" />
        </nav>
        <div class="-mx-2 mb-3 px-2 text-[13px] font-medium">Reference</div>
        <nav aria-label="API reference" class="-mx-2">
          <Navigation v-for="item of filteredNavigation" :key="item.id" :navigation="item" :selected-id="selectedPageId" @navigate="handlePageSelect" />
          <p v-if="!filteredNavigation.length" class="p-4 text-[13px] text-gray-500 dark:text-gray-400">No matching operations.</p>
        </nav>
        <template v-if="webhooks.length">
          <div class="-mx-2 mb-3 mt-6 px-2 text-[13px] font-medium">Webhooks</div>
          <nav aria-label="Webhooks" class="-mx-2">
            <Navigation v-for="item of filteredWebhooks" :key="item.id" :navigation="item" :selected-id="selectedPageId" @navigate="handlePageSelect" />
            <p v-if="!filteredWebhooks.length" class="p-4 text-[13px] text-gray-500 dark:text-gray-400">No matching webhooks.</p>
          </nav>
        </template>
        <template v-if="showSchemas && schemas.length">
          <div class="-mx-2 mb-3 mt-6 px-2 text-[13px] font-medium">Schemas</div>
          <nav aria-label="Schemas" class="-mx-2">
            <NavigationItem v-for="item of filteredSchemas" :key="item.id" :label="item.name" :active="item.id === selectedPageId" :aria-current="item.id === selectedPageId ? 'page' : undefined" :title="item.name" @click="handlePageSelect(item.id)" />
            <p v-if="!filteredSchemas.length" class="p-4 text-[13px] text-gray-500 dark:text-gray-400">No matching schemas.</p>
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
        <SchemaPage v-if="selectedSchema" :key="selectedSchema.id" :name="selectedSchema.name" :schema="selectedSchema.schema" :components="components" />
        <article v-if="selectedWebhook" :key="selectedWebhook.id" class="min-w-0 [overflow-wrap:anywhere]">
          <Operation webhook base="https://your-app.example" :path="`/webhooks/${encodeURIComponent(selectedWebhook.path)}`" :method="selectedWebhook.method" :operation="selectedWebhook.operation" :components="components" />
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
