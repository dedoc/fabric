<script setup lang="ts">
import type {Components, Operation} from "@/core/openapi/types";
import Request from "@/components/OpenApi/Request.vue";
import Examples from "@/components/OpenApi/Examples.vue";
import {computed, inject} from "vue";
import Description from "@/components/OpenApi/Description.vue";
import Responses from "@/components/OpenApi/Responses.vue";
import MethodChip from "@/components/OpenApi/Partials/MethodChip.vue";
import OperationDatums from "@/components/OpenApi/Partials/OperationDatums.vue";
import {provideMediaTypeSelections} from "@/components/OpenApi/useMediaType";
import WebhookIcon from "@/components/UI/WebhookIcon.vue";
import {documentKey} from '@/utils/symbols'
import {isNavigationTag} from '@/core/openapi/tags'
import Tag from '@/components/OpenApi/Partials/Tag.vue'

const props = defineProps<{
  base: string, // todo: should not be here!
  components: Components, // todo: should not be here!
  path: string,
  method: string,
  operation: Operation,
  webhook?: boolean,
  webhookName?: string,
}>()


provideMediaTypeSelections()
const document = inject(documentKey, computed(() => ({})))
const labels = computed(() => (document.value.tags ?? []).filter(tag =>
  !isNavigationTag(tag) && props.operation.tags?.includes(tag.name)
))

const operationSummary = computed(() => {
  return props.operation.summary ?? props.operation.operationId
})
</script>

<template>
  <div class="grid grid-cols-1 gap-[--sections-gap] min-[1200px]:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]" :class="{'min-[1200px]:gap-y-3': operation.description}">
    <div class="col-start-1 min-w-0 space-y-3">
      <h1 v-if="operationSummary" class="text-balance text-2xl font-medium tracking-tight md:text-3xl">{{ operationSummary }}</h1>
      <ul v-if="labels.length" aria-label="Operation tags" class="flex flex-wrap items-center gap-2">
        <li v-for="tag in labels" :key="tag.name"><Tag :tag="tag" /></li>
      </ul>
      <div class="space-y-0.5">
        <div class="flex items-baseline gap-2.5 text-base">
          <MethodChip :method="method" class="shrink-0"/>
          <div v-if="webhook" class="inline-flex min-w-0 items-center gap-1.5 text-gray-900 dark:text-gray-100">
            <WebhookIcon class="size-4 shrink-0" />
            <span class="min-w-0">Webhook · {{ webhookName }}</span>
          </div>
          <div v-else class="min-w-0 text-gray-900 dark:text-gray-100"><span class="text-gray-500 dark:text-gray-400">{{ base.replace(/\/$/, '') }}</span>/{{ path.replace(/^\//, '') }}</div>
        </div>
        <OperationDatums :operation="operation"/>
      </div>
      <Description v-if="operation.description" class="leading-normal text-gray-800 dark:text-gray-200 [&_pre]:text-xs [&_pre]:leading-4 sm:text-base min-[1200px]:hidden" :content="operation.description"/>
    </div>

    <div class="col-start-1 flex min-w-0 flex-col gap-[--sections-gap]">
      <Description v-if="operation.description" class="hidden leading-normal text-gray-800 dark:text-gray-200 [&_pre]:text-xs [&_pre]:leading-4 sm:text-base min-[1200px]:block" :content="operation.description"/>
      <Request
          v-if="operation.parameters?.length || operation.requestBody"
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
    
    <Examples :base="base" :components="components" :path="path" :method="method" :operation="operation" :webhook-name="webhookName" />
  </div>
</template>
