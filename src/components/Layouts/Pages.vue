<script setup lang="ts">
import type {Components, Paths as PathsType} from "../OpenApi/types.ts";
import {computed, onMounted, onUnmounted, provide, ref} from "vue";
import {showSchemasKey} from "../../utils/symbols.ts";
import Paths from "../OpenApi/Paths.vue";
import SchemaPage from "../OpenApi/SchemaPage.vue";
import {Navigation as NavigationType} from "./Partials/types.ts";
import Navigation from "./Partials/Navigation.vue";
import {getInlineOperations, getOperationTitle, InlineOperation} from "../OpenApi/utils.ts";

const props = withDefaults(defineProps<{
  base: string, // todo: should not be here!
  document: any, // todo: should not be here!
  components: Components, // todo: should not be here!
  paths: PathsType,
  showSchemas?: boolean,
}>(), {showSchemas: true})

provide(showSchemasKey, computed(() => props.showSchemas))

const operations = computed(() => getInlineOperations(props.paths))

function getPageIdFromUrl (): string|undefined {
  const url = new URL(window.location.href)
  return url.hash.replace(/^#/, '')
}

const selectedPageId = ref<string|undefined>(getPageIdFromUrl())

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
  return operations.reduce<NavigationType[]>((acc, operation) => {
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
}

const mobileNavigationOpen = ref(false)
const search = ref('')
const filteredNavigation = computed(() => buildNavigationTree(operations.value.filter(operation =>
  `${getOperationTitle(operation.path, operation.operation)} ${operation.path} ${operation.operation.tags?.join(' ') ?? ''}`
    .toLowerCase().includes(search.value.toLowerCase())
)))
function syncLocation() {
  selectedPageId.value = getPageIdFromUrl()
  window.scrollTo(0, 0)
  mobileNavigationOpen.value = false
}
onMounted(() => {
  window.addEventListener('popstate', syncLocation)
  window.addEventListener('hashchange', syncLocation)
})
onUnmounted(() => {
  window.removeEventListener('popstate', syncLocation)
  window.removeEventListener('hashchange', syncLocation)
})
</script>

<template>
  <div class="bg-white text-neutral-900 [&_button:focus-visible]:outline [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-2 [&_button:focus-visible]:outline-neutral-500 [&_select:focus-visible]:outline [&_select:focus-visible]:outline-2 [&_select:focus-visible]:outline-offset-2 [&_select:focus-visible]:outline-neutral-500">
    <header class="sticky top-0 z-30 flex h-16 w-full items-center gap-4 border-b border-[#eeeeef] bg-white px-5 md:fixed md:h-14 md:w-[248px] md:gap-0 md:border-0 md:px-6 min-[1200px]:w-[296px]">
      <div class="min-w-0 flex-1 truncate text-base font-semibold md:w-full md:flex-none md:text-lg">{{ document.info.title ?? '' }}</div>
      <button class="rounded-md border border-[#eeeeef] p-2 text-[13px] md:hidden" :aria-expanded="mobileNavigationOpen" aria-controls="docs-navigation" @click="mobileNavigationOpen = !mobileNavigationOpen">
        {{ mobileNavigationOpen ? 'Close menu' : 'Menu' }}
      </button>
    </header>
    <div class="flex items-start md:min-h-dvh">
      <aside id="docs-navigation" class="sticky top-16 h-[calc(100dvh-64px)] w-full shrink-0 overflow-y-auto px-6 pb-5 pt-2 md:top-14 md:h-[calc(100dvh-56px)] md:w-[248px] min-[1200px]:w-[296px]" :class="mobileNavigationOpen ? 'max-md:fixed max-md:bottom-0 max-md:z-20 max-md:bg-white' : 'max-md:hidden'">
        <label class="mb-6 flex items-center gap-2 rounded-lg border border-[#eeeeef] px-2.5 py-2 text-neutral-500 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-neutral-500">
          <svg class="size-4 shrink-0" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor"/><path d="m13 13 4 4" stroke="currentColor"/></svg>
          <input class="min-w-0 w-full bg-transparent text-[13px] outline-none" v-model="search" type="search" placeholder="Search reference…" aria-label="Search reference">
        </label>
        <div class="-mx-2 mb-3 px-2 text-[13px] font-medium">Reference</div>
        <nav aria-label="API reference" class="-mx-2">
          <Navigation v-for="item of filteredNavigation" :key="item.id" :navigation="item" :selected-id="selectedPageId" @navigate="handlePageSelect" />
          <p v-if="!filteredNavigation.length" class="p-4 text-[13px] text-neutral-500">No matching operations.</p>
        </nav>
        <template v-if="showSchemas && schemas.length">
          <div class="-mx-2 mb-3 mt-6 px-2 text-[13px] font-medium">Schemas</div>
          <nav aria-label="Schemas" class="-mx-2">
            <button v-for="item of filteredSchemas" :key="item.id" type="button" class="block w-full truncate rounded-[--navigation-item-radius] py-[--navigation-item-padding-y] px-2 text-left text-sm text-gray-700 hover:bg-[--navigation-item-highlight]" :class="{'bg-[--navigation-item-highlight] text-gray-900': item.id === selectedPageId}" :aria-current="item.id === selectedPageId ? 'page' : undefined" :title="item.name" @click="handlePageSelect(item.id)">{{ item.name }}</button>
            <p v-if="!filteredSchemas.length" class="p-4 text-[13px] text-neutral-500">No matching schemas.</p>
          </nav>
        </template>
      </aside>
      <main class="min-w-0 flex-1 px-5 pb-12 md:px-6 md:pb-20 md:pt-6 min-[1200px]:pl-8 min-[1200px]:pr-10 min-[1600px]:mx-auto min-[1600px]:max-w-[1400px]">
        <SchemaPage v-if="selectedSchema" :key="selectedSchema.id" :name="selectedSchema.name" :schema="selectedSchema.schema" :components="components" />
        <div v-if="selectedOperation" :key="selectedOperation.id">
          <article class="min-w-0 [overflow-wrap:anywhere]">
            <Paths :base="base" :components="components" :paths="{[selectedOperation.path]: {[selectedOperation.method]: selectedOperation.operation}}" />
          </article>
        </div>
      </main>
    </div>
  </div>
</template>
