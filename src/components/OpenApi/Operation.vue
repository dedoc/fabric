<script setup lang="ts">
import type {Components, Operation} from "./types";
import Request from "./Request.vue";
import Examples from "./Examples.vue";
import {computed} from "vue";
import Description from "./Description.vue";
import Responses from "./Responses.vue";
import MethodChip from "./Partials/MethodChip.vue";
import OperationDatums from "./Partials/OperationDatums.vue";

const props = defineProps<{
  base: string, // todo: should not be here!
  components: Components, // todo: should not be here!
  path: string,
  method: string,
  operation: Operation,
}>()


const operationSummary = computed(() => {
  return props.operation.summary ?? props.operation.operationId
})
</script>

<template>
  <div class="grid grid-cols-1 gap-6 max-md:gap-8 max-md:pt-7 min-[1200px]:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] min-[1200px]:gap-8">
    <div class="col-start-1 min-w-0 space-y-3">
      <div v-if="operationSummary" class="text-[26px] font-medium leading-[1.3] md:text-[30px]">{{ operationSummary }}</div>
      <div class="flex items-baseline gap-2.5 text-lg">
        <MethodChip :method="method" class="shrink-0"/>
        <div class="text-gray-500"><span class="text-gray-400">{{ base }}</span>{{ path }}</div>
      </div>
      <OperationDatums :operation="operation"/>
    </div>

    <div class="col-start-1 flex min-w-0 flex-col gap-[--sections-gap]">
      <div class="flex flex-col gap-4 empty:hidden">
        <Description v-if="operation.description" class="mt-0 text-sm !text-neutral-500 leading-normal" :content="operation.description"/>
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
    <Examples :base="base" :components="components" :path="path" :method="method" :operation="operation" />
  </div>
</template>
