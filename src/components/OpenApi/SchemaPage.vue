<script setup lang="ts">
import {computed} from 'vue'
import type {Components, Schema as SchemaType} from './types'
import Description from './Description.vue'
import Schema from './Schema.vue'
import SchemaExamples from './SchemaExamples.vue'
import {resolveExampleSchema} from './schemaExamples'
import {useReferences} from './useReferences'

const props = defineProps<{name: string, schema: SchemaType, components: Components}>()
const references = useReferences(() => props.components)
const resolvedSchema = computed(() => resolveExampleSchema(props.schema, props.components, references.document.value))
</script>

<template>
  <article class="grid grid-cols-1 gap-8 [overflow-wrap:anywhere] min-[1200px]:min-h-[calc(100dvh-112px)] min-[1200px]:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] min-[1200px]:grid-rows-[auto_1fr]">
    <h1 class="col-start-1 min-w-0 text-balance text-2xl font-medium tracking-tight md:text-3xl">{{ resolvedSchema?.title ?? name }}</h1>
    <div class="col-start-1 flex min-w-0 flex-col gap-[--sections-gap]">
      <Description v-if="resolvedSchema?.description" class="text-gray-700" :content="resolvedSchema.description" />
      <Schema :schema="schema" :components="components" :level="1" :shouldHideDescription="true" :shouldHideMainType="true" :shouldDisablePropertiesPadding="true" />
    </div>
    <SchemaExamples :schema="schema" :components="components" />
  </article>
</template>
