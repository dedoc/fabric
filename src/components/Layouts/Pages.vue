<script setup lang="ts">
import type {Components, Operation, Paths as PathsType} from "../OpenApi/types.ts";
import {computed, onMounted, ref} from "vue";
import Paths from "../OpenApi/Paths.vue";
import OperationNavigation from "./Partials/OperationNavigation.vue";
import {Navigation as NavigationType} from "./Partials/types.ts";
import Navigation from "./Partials/Navigation.vue";

const props = defineProps<{
  base: string, // todo: should not be here!
  components: Components, // todo: should not be here!
  paths: PathsType,
}>()

type InlineOperation = {
  id: string,
  method: string,
  path: string,
  operation: Operation,
}

const operations = computed<InlineOperation[]>(() => {
  return Object.entries(props.paths).reduce((acc, [path, pathItem]) => {
    return acc.concat(Object.entries(pathItem).map(([method, operation]) => {
      return {
        id: getOperationId(method, path, operation),
        method,
        path,
        operation,
      }
    }))
  }, [])
})

function getOperationIdFromUrl (): string|undefined {
  const url = new URL(window.location.href)
  return url.hash.replace(/^#/, '')
}

const selectedOperationId = ref<string|undefined>(getOperationIdFromUrl())

const selectedOperation = computed<InlineOperation|undefined>(() => {
  const operationId = selectedOperationId.value
  if (! operationId) {
    return undefined
  }
  return operations.value.find(op => op.id === operationId)
})

// gets URL safe operation id
const getOperationId = (method: string, path: string, operation: Operation) => {
  const operationId = operation.operationId ?? `${method.toLowerCase()}-${path.replace(/\//g, '-').replace(/\{/g, '').replace(/\}/g, '')}`

  return 'operations/' + encodeURIComponent(operationId)
}

const getOperationTitle = (operation: InlineOperation) => operation.operation.summary ?? operation.operation.operationId ?? operation.path

function isOperationSelected (operation: InlineOperation): boolean {
  return selectedOperation.value?.id === operation.id
}

function handleOperationSelect (operationId: string) {
  selectedOperationId.value = operationId

  // push to history
  window.history.pushState({}, '', `#${operationId}`)

  // reset scroll
  window.scrollTo(0, 0)
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
        name: getOperationTitle(operation),
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

    folderNavigation.children.push({
      id: operation.id,
      type: 'operation',
      name: getOperationTitle(operation),
      method: operation.method,
    })

    return acc
  }, [])
}

const navigation = computed<NavigationType[]>(() => buildNavigationTree(operations.value))
</script>

<template>
<pre v-if="false" class="text-xs">{{ navigation }}</pre>
<div v-else class="flex relative">
  <div class="sticky shrink-0 top-0 h-screen overflow-y-auto w-[260px] p-2 hidden sm:block">
    <div class="p-2">
      <div class="relative">
        <input class="w-full p-1 px-2.5 text-sm  border rounded-md focus:outline-none" type="text" placeholder="Search...">
        <!-- hotkey: ⌘ + k -->
        <div class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs rounded bg-gray-100 px-1.5">⌘ + K</div>
      </div>
    </div>
    <div class="uppercase font-medium text-gray-400 px-2 py-2 text-xs mt-4">Reference</div>
    <Navigation
        v-for="(navigationItem, index) of navigation"
        :navigation="navigationItem"
        :selected-id="selectedOperationId"
        @navigate="handleOperationSelect($event)"
    />
  </div>
  <div class="sticky top-0 h-screen w-px bg-gray-100 translate-x-[-1px] z-[-1]  hidden sm:block"></div>
  <div class="flex-1 min-w-0">
    <div class="p-6 sm:px-20 sm:py-12 sm:pb-24 max-w-[740px] w-full" style="overflow-wrap: anywhere;" :key="selectedOperation">
      <Paths
          v-if="selectedOperation"
          :base="base"
          :components="components"
          :paths="{[selectedOperation.path]: {[selectedOperation.method]: selectedOperation.operation}}"
      />
    </div>
  </div>
</div>
</template>
