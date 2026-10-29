<script setup lang="ts">
import {computed} from 'vue'
import type {Components, Example, Reference, Schema} from '@/core/openapi/types'
import Description from '@/components/OpenApi/Description.vue'
import SchemaAttribute from '@/components/OpenApi/SchemaAttribute.vue'
import ReferenceDiagnostics from '@/components/OpenApi/ReferenceDiagnostics.vue'
import {useReferences} from '@/components/OpenApi/useReferences'
import {resolveExampleSchema} from '@/core/openapi/schemaExamples'
import {directionalExample, type SchemaDirection} from '@/core/openapi/schemaUsage'

const props = defineProps<{example?: unknown, examples?: Record<string, Example|Reference>, components: Components, schema?: Schema, direction?: SchemaDirection}>()
const references = useReferences(() => props.components)
const resolvedSchema = computed(() => props.direction ? resolveExampleSchema(props.schema, props.components, references.document.value) : undefined)
const displayedExample = computed(() => directionalExample(props.example, resolvedSchema.value, props.direction ?? 'neutral'))
const named = computed(() => Object.entries(props.examples ?? {}).map(([name, entry]) => {
  const result = references.resolve<Example>(entry)
  return {name, ...result, value: result.value ? {...result.value, value: directionalExample(result.value.value, resolvedSchema.value, props.direction ?? 'neutral')} : undefined}
}))
const issues = computed(() => named.value.flatMap(result => result.issues))
</script>

<template>
  <div v-if="example !== undefined || named.length" class="space-y-1">
  <ReferenceDiagnostics :issues="issues" />
  <SchemaAttribute v-if="example !== undefined" title="Example" :value="displayedExample" />
  <template v-else>
    <template v-for="(entry, index) in named" :key="entry.name">
      <template v-if="entry.value">
        <SchemaAttribute v-if="entry.value.value !== undefined || entry.value.externalValue" :title="index === 0 ? (named.length > 1 ? 'Examples' : 'Example') : ''" :value="entry.value.value !== undefined ? entry.value.value : entry.value.externalValue">
          <div class="inline text-sm leading-normal text-gray-500 dark:text-gray-400 sm:text-xs">
            <strong class="ml-1 font-medium">{{ entry.value.summary ?? entry.name }}</strong>
            <template v-if="entry.value.description">
              <span aria-hidden="true"> · </span><Description class="inline text-sm leading-normal text-gray-500 dark:text-gray-400 sm:text-xs [&>p]:inline" :content="entry.value.description" />
            </template>
          </div>
        </SchemaAttribute>
        <template v-else>
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400 sm:text-xs">{{ entry.value.summary ?? entry.name }}</p>
          <Description v-if="entry.value.description" class="text-sm leading-normal text-gray-500 dark:text-gray-400 sm:text-xs" :content="entry.value.description" />
        </template>
      </template>
    </template>
  </template>
  </div>
</template>
