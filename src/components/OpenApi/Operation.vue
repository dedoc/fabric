<script setup lang="ts">
import type {Components, Operation} from "./types";
import Request from "./Request.vue";
import Examples from "./Examples.vue";
import {computed, ref} from "vue";
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
  webhook?: boolean,
}>()


provideMediaTypeSelections()
const auth = ref<InstanceType<typeof OperationDatums>>()

const operationSummary = computed(() => {
  return props.operation.summary ?? props.operation.operationId
})
</script>

<template>
  <div class="grid grid-cols-1 gap-8 min-[1200px]:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
    <div class="col-start-1 min-w-0 space-y-3">
      <h1 v-if="operationSummary" class="text-balance text-2xl font-medium tracking-tight md:text-3xl">{{ operationSummary }}</h1>
      <p v-if="webhook" class="text-base text-gray-500 sm:text-sm">Webhook · Sent to your application. The request describes what you receive; the response describes what your endpoint should return.</p>
      <div class="space-y-0.5">
        <div class="flex items-baseline gap-2.5 text-base">
          <MethodChip :method="method" class="shrink-0"/>
          <div v-if="webhook" class="min-w-0 text-gray-900">Your webhook URL</div>
          <div v-else class="min-w-0 text-gray-900"><span class="text-gray-500">{{ base.replace(/\/$/, '') }}</span>/{{ path.replace(/^\//, '') }}</div>
        </div>
        <OperationDatums ref="auth" :operation="operation"/>
      </div>
    </div>

    <div class="col-start-1 flex min-w-0 flex-col gap-[--sections-gap]">
      <Description v-if="operation.description" class="leading-normal text-gray-700" :content="operation.description"/>
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
    <Examples :base="base" :components="components" :path="path" :method="method" :operation="operation" @authenticate="trigger => auth?.open(trigger)" />
  </div>
</template>
