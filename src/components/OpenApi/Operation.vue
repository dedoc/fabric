<script setup lang="ts">
import type {Components, Operation} from "./types";
import Request from "./Request.vue";
import {computed} from "vue";
import Description from "./Description.vue";
import Responses from "./Responses.vue";

const props = defineProps<{
  base: string, // todo: should not be here!
  components: Components, // todo: should not be here!
  path: string,
  method: string,
  operation: Operation,
}>()

const operationsFields = ['get', 'post', 'put', 'delete', 'options', 'head', 'patch', 'trace']

const operationSummary = computed(() => {
  return props.operation.summary ?? props.operation.operationId
})
</script>

<template>
  <div class="space-y-10">
    <div class="space-y-3">
      <div v-if="operationSummary" class="font-semibold text-xl/[160%]">{{ operationSummary }}</div>
      <div class="flex items-baseline gap-2.5 text-base">
        <div class="font-jetbrains-mono text-green-700 leading-[160%] uppercase">{{ method }}</div>
        <div class="text-gray-500"><span class="text-gray-400">{{ base }}</span>{{ path }}</div>
      </div>
      <Description v-if="operation.description" class="text-gray-900 !mt-4 leading-6 text-base" :content="operation.description"/>
    </div>

    <Request
        v-if="operation.parameters || operation.requestBody"
        :components="components"
        :parameters="operation.parameters"
        :requestBody="operation.requestBody"
    />
    <Responses
      v-if="operation.responses"
      :responses="operation.responses"
      :components="components"
    />
  </div>
</template>
