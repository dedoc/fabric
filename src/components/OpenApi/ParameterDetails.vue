<script setup lang="ts">
import {computed} from 'vue'
import type {Components, Parameter} from './types'
import Schema from './Schema.vue'
import Description from './Description.vue'
import ValueExamples from './ValueExamples.vue'
import {provideCompositionScope} from './useCompositionSelections'

const props = defineProps<{parameter: Parameter, components: Components}>()
provideCompositionScope(computed(() => `parameter:${props.parameter.in}:${props.parameter.name}`))
const hasExamples = computed(() => props.parameter.example !== undefined || Object.keys(props.parameter.examples ?? {}).length > 0)
const contentEntry = computed(() => Object.entries(props.parameter.content ?? {})[0])
const contentMedia = computed(() => contentEntry.value?.[1])
const contentHasExamples = computed(() => contentMedia.value?.example !== undefined || Object.keys(contentMedia.value?.examples ?? {}).length > 0)
const schema = computed(() => props.parameter.schema ?? contentMedia.value?.schema)
</script>

<template>
  <div class="min-w-0 space-y-1.5" :aria-label="`${parameter.in} parameter ${parameter.name}`">
    <template v-if="schema">
      <Schema :schema="schema" :components="components" direction="request" :property-title="parameter.name" :property-required="parameter.required" :are-properties-initially-visible="false" :should-hide-examples="hasExamples || contentHasExamples">
        <template v-if="contentEntry" #type-suffix><span class="text-gray-500 dark:text-gray-400">{{ contentEntry[0] }}</span></template>
        <template v-if="parameter.description !== undefined" #description>
          <Description class="text-base leading-normal text-gray-500 dark:text-gray-400 sm:text-sm" :content="parameter.description" />
        </template>
      </Schema>
    </template>
    <template v-else>
    <div class="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-base sm:text-sm">
      <span class="font-medium text-gray-900 dark:text-gray-100">{{ parameter.name }}</span>
      <span v-if="contentEntry" class="text-gray-500 dark:text-gray-400">{{ contentEntry[0] }}</span>
      <span v-if="parameter.required" class="text-amber-700 dark:text-amber-400">required</span>
    </div>
    <Description v-if="parameter.description" class="text-base leading-normal text-gray-500 dark:text-gray-400 sm:text-sm" :content="parameter.description" />
    </template>
    <ValueExamples v-if="contentMedia && !hasExamples" :example="contentMedia.example" :examples="contentMedia.examples" :components="components" :schema="schema" direction="request" />
    <ValueExamples :example="parameter.example" :examples="parameter.examples" :components="components" :schema="schema" direction="request" />
  </div>
</template>
