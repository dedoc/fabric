<script setup lang="ts">
import {computed} from 'vue'
import type {Components, Schema as SchemaType} from './types'
import Description from './Description.vue'
import Schema from './Schema.vue'
import SchemaExamples from './SchemaExamples.vue'
import {resolveExampleSchema} from './schemaExamples'

const props = defineProps<{name: string, schema: SchemaType, components: Components}>()
const resolvedSchema = computed(() => resolveExampleSchema(props.schema, props.components))
</script>

<template>
  <article class="grid grid-cols-1 gap-x-6 [overflow-wrap:anywhere] max-md:pt-7 min-[1200px]:min-h-[calc(100dvh-104px)] min-[1200px]:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] min-[1200px]:grid-rows-[auto_1fr] min-[1200px]:gap-x-8" :class="resolvedSchema?.description ? 'gap-y-4' : 'gap-y-8'">
    <h1 class="col-start-1 min-w-0 text-[26px] font-medium leading-[1.3] md:text-[30px]">{{ resolvedSchema?.title ?? name }}</h1>
    <div class="col-start-1 flex min-w-0 flex-col gap-[--sections-gap]">
      <Description v-if="resolvedSchema?.description" class="mt-0 text-sm !text-neutral-500 leading-normal" :content="resolvedSchema.description" />
      <Schema :schema="schema" :components="components" :level="1" :shouldHideDescription="true" :shouldHideMainType="true" :shouldDisablePropertiesPadding="true" />
    </div>
    <SchemaExamples :schema="schema" :components="components" />
  </article>
</template>
