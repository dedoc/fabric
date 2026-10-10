<script setup lang="ts">
import {computed} from 'vue'
import type {Components, Schema as SchemaType} from './types'
import Description from './Description.vue'
import Schema from './Schema.vue'
import SchemaExamples from './SchemaExamples.vue'
import {resolveExampleSchema} from './schemaExamples'
import {useReferences} from './useReferences'
import {provideCompositionSelections} from './useCompositionSelections'

const props = defineProps<{name: string, schema: SchemaType, components: Components}>()
provideCompositionSelections()
const references = useReferences(() => props.components)
const resolvedSchema = computed(() => resolveExampleSchema(props.schema, props.components, references.document.value))
</script>

<template>
  <article class="grid grid-cols-1 gap-[--sections-gap] [overflow-wrap:anywhere] min-[1200px]:min-h-[calc(100dvh-112px)] min-[1200px]:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] min-[1200px]:grid-rows-[auto_1fr]">
    <div class="flex flex-col gap-4">
      <h1 class="col-start-1 min-w-0 text-balance text-2xl font-medium tracking-tight md:text-3xl">{{ resolvedSchema?.title ?? name }}</h1>
      <Description v-if="resolvedSchema?.description" class="text-gray-800 sm:text-base" :content="resolvedSchema.description" />
    </div>
    <div class="col-start-1 flex min-w-0 flex-col ">
      <Schema :schema="schema" :components="components" :level="1" :shouldHideDescription="true" :shouldHideMainType="true" :shouldDisablePropertiesPadding="true" />
    </div>
    <SchemaExamples :schema="schema" :components="components" :name="name" />
  </article>
</template>
