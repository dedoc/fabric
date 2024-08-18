<script setup lang="ts">
import type {Components, Operation, Paths as PathsType} from "../OpenApi/types.ts";
import {computed, ref} from "vue";
import Paths from "../OpenApi/Paths.vue";
import MethodChip from "../OpenApi/Partials/MethodChip.vue";

const props = defineProps<{
  base: string, // todo: should not be here!
  components: Components, // todo: should not be here!
  paths: PathsType,
}>()

type InlineOperation = {
  method: string,
  path: string,
  operation: Operation,
}

const operations = computed<InlineOperation[]>(() => {
  return Object.entries(props.paths).reduce((acc, [path, pathItem]) => {
    return acc.concat(Object.entries(pathItem).map(([method, operation]) => {
      return {
        method,
        path,
        operation,
      }
    }))
  }, [])
})

const selectedOperation = ref<InlineOperation|undefined>()
</script>

<template>
<div class="flex relative">
  <div class="sticky shrink-0 top-0 h-screen overflow-y-auto w-[260px] p-2">
    <div class="uppercase font-medium text-gray-400 px-2 py-2 text-xs">Reference</div>
    <div
        v-for="(operation, index) of operations"
        class="flex text-sm p-2 px-2 items-baseline justify-between gap-2.5 rounded-md hover:bg-gray-50 cursor-pointer relative"
        @click="selectedOperation = operation"
    >
      <div class="truncate text-gray-700" :class="{'text-gray-900': selectedOperation?.operation.operationId === operation.operation.operationId}">{{ operation.operation.summary ?? operation.operation.operationId ?? operation.path }}</div>
      <MethodChip class="text-xs !text-gray-400" :method="operation.method"/>
      <div
          v-if="selectedOperation?.operation.operationId === operation.operation.operationId"
          class="absolute right-[-8px] h-[calc(100%-12px)] top-[6px] w-px bg-[--primary-color] z-10"
      ></div>
    </div>
  </div>
  <div class="sticky top-0 h-screen w-px bg-gray-100 translate-x-[-1px] z-[-1]"></div>
  <div class="flex-1">
    <div class="px-20 py-12 pb-24 max-w-[740px]" :key="selectedOperation">
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
