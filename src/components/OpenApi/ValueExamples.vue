<script setup lang="ts">
import {computed} from 'vue'
import type {Components, Example, Reference} from './types'
import Description from './Description.vue'
import SchemaAttribute from './SchemaAttribute.vue'
import ReferenceDiagnostics from './ReferenceDiagnostics.vue'
import {useReferences} from './useReferences'

const props = defineProps<{example?: unknown, examples?: Record<string, Example|Reference>, components: Components}>()
const references = useReferences(() => props.components)
const named = computed(() => Object.entries(props.examples ?? {}).map(([name, entry]) => ({name, ...references.resolve<Example>(entry)})))
const issues = computed(() => named.value.flatMap(result => result.issues))
</script>

<template>
  <div v-if="example !== undefined || named.length" class="space-y-1">
  <ReferenceDiagnostics :issues="issues" />
  <SchemaAttribute v-if="example !== undefined" title="Example" :value="example" />
  <template v-else>
    <template v-for="(entry, index) in named" :key="entry.name">
      <template v-if="entry.value">
        <SchemaAttribute v-if="entry.value.value !== undefined || entry.value.externalValue" :title="index === 0 ? (named.length > 1 ? 'Examples' : 'Example') : ''" :value="entry.value.value !== undefined ? entry.value.value : entry.value.externalValue">
          <div class="inline text-sm leading-normal text-gray-500 sm:text-xs">
            <strong class="ml-1 font-medium">{{ entry.value.summary ?? entry.name }}</strong>
            <template v-if="entry.value.description">
              <span aria-hidden="true"> · </span><Description class="inline text-sm leading-normal text-gray-500 sm:text-xs [&>p]:inline" :content="entry.value.description" />
            </template>
          </div>
        </SchemaAttribute>
        <template v-else>
          <p class="text-sm font-medium text-gray-500 sm:text-xs">{{ entry.value.summary ?? entry.name }}</p>
          <Description v-if="entry.value.description" class="text-sm leading-normal text-gray-500 sm:text-xs" :content="entry.value.description" />
        </template>
      </template>
    </template>
  </template>
  </div>
</template>
