<script setup lang="ts">
import type {Components, Operation} from "./types";
import Request from "./Request.vue";
import Examples from "./Examples.vue";
import {computed} from "vue";
import Description from "./Description.vue";
import Responses from "./Responses.vue";
import MethodChip from "./Partials/MethodChip.vue";
import OperationDatums from "./Partials/OperationDatums.vue";
import {provideMediaTypeSelections} from "./useMediaType";

const props = defineProps<{
  base: string, // todo: should not be here!
  components: Components, // todo: should not be here!
  path: string,
  method: string,
  operation: Operation,
}>()


provideMediaTypeSelections()

const operationSummary = computed(() => {
  return props.operation.summary ?? props.operation.operationId
})
</script>

<template>
  <div class="grid grid-cols-1 gap-8 min-[1200px]:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
    <div class="col-start-1 min-w-0 space-y-3">
      <h1 v-if="operationSummary" class="text-balance text-2xl font-medium tracking-tight md:text-3xl">{{ operationSummary }}</h1>
      <div class="flex items-baseline gap-2.5 text-base">
        <MethodChip :method="method" class="shrink-0"/>
        <div class="min-w-0 text-gray-900"><span class="text-gray-500">{{ base.replace(/\/$/, '') }}</span>/{{ path.replace(/^\//, '') }}</div>
      </div>
      <OperationDatums :operation="operation"/>
    </div>

    <div class="col-start-1 flex min-w-0 flex-col gap-[--sections-gap]">
      <Description v-if="operation.description" :content="operation.description"/>
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
