<script setup lang="ts">
import type {Components, MediaType} from "./types.ts";
import {computed, useSlots} from "vue";
import Schema from "./Schema.vue";
import SchemaTypePreview from "./SchemaTypePreview.vue";
import {getSchemaTypePreview} from "./utils.ts";
import Select from "../UI/Select.vue";
import {useMediaType} from "./useMediaType";
import ValueExamples from './ValueExamples.vue'
import type {SchemaDirection} from './schemaUsage'
import {provideCompositionScope} from './useCompositionSelections'
import Description from './Description.vue'
import {useReferences} from './useReferences'
import {schemaDisplay} from './schemaDisplay'

const props = defineProps<{
  components: Components,
  content?: Record<string, MediaType>,
  label?: string,
  selectionKey?: string,
  showExamples?: boolean,
  shouldHideExamples?: boolean,
  direction?: SchemaDirection,
}>()

const {types, type, media} = useMediaType(() => props.content, () => props.selectionKey ?? '')
const slots = useSlots()
const references = useReferences(() => props.components)
const bodyDescriptions = computed(() => {
  if (!media.value?.schema) return []
  const {layers} = schemaDisplay(media.value.schema, references.document.value)
  const ownDescription = layers[0]?.schema.description
  return ownDescription !== undefined ? [ownDescription] : layers.flatMap(layer => layer.schema.description ? [layer.schema.description] : [])
})
const hasBodyDescription = computed(() => !!slots.description || bodyDescriptions.value.some(Boolean))
provideCompositionScope(computed(() => `${props.selectionKey ?? ''}:${type.value}`))
const schemaNamePreview = computed(() => {
  const schema = media.value?.schema
  return schema?.oneOf?.length || schema?.anyOf?.length ? undefined : getSchemaTypePreview(schema)
})
</script>

<template>
  <div v-if="media">
    <div class="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-2 gap-y-1 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
      <div class="col-start-1 row-start-1">
        <slot name="title">
          <div class="font-medium text-gray-900 dark:text-gray-100 text-base">Body</div>
        </slot>
      </div>
      <div v-if="schemaNamePreview || $slots['type-suffix']" class="col-span-2 col-start-1 row-start-2 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 break-words text-base font-normal text-gray-500 dark:text-gray-400 sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:text-sm">
        <SchemaTypePreview v-if="schemaNamePreview" :schema="media.schema" :components="components" />
        <slot name="type-suffix" />
      </div>
      <Select v-model="type" :options="types.map(value => ({value, label: value}))" class="col-start-2 row-start-1 max-w-full justify-self-end text-base font-normal text-gray-500 dark:text-gray-400 sm:col-start-3 sm:text-sm" :aria-label="label ?? 'Body content type'" :title="type" />
    </div>
    <div v-if="hasBodyDescription" class="mt-1">
      <slot name="description">
        <Description v-for="(description, index) in bodyDescriptions" :key="index" class="leading-normal text-gray-700 dark:text-gray-300" :content="description" />
      </slot>
    </div>
    <div v-if="media.schema" :key="type" :class="[hasBodyDescription ? 'mt-6' : 'mt-4']">
      <Schema
          :components="components"
          :schema="media.schema"
          :direction="direction"
          :should-hide-description="hasBodyDescription"
          :should-hide-examples="shouldHideExamples || (showExamples && (media.example !== undefined || Object.keys(media.examples ?? {}).length > 0))"
          :shouldHideMainType="true"
          :shouldDisablePropertiesPadding="true"
      />
    </div>
    <ValueExamples v-if="showExamples" class="mt-3" :example="media.example" :examples="media.examples" :components="components" :schema="media.schema" :direction="direction" />
  </div>
</template>
