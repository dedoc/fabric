<script setup lang="ts">
import {computed} from 'vue'
import type {Schema} from '@/core/openapi/types'
import {getSchemaBounds} from '@/core/openapi/schemaBounds'
import SchemaAttribute from '@/components/OpenApi/SchemaAttribute.vue'

const props = defineProps<{schema: Schema}>()
const bounds = computed(() => {
  const {minimum, maximum} = getSchemaBounds(props.schema)
  return [
    {operator: '>=', value: props.schema.minLength, unit: 'characters'},
    {operator: '<=', value: props.schema.maxLength, unit: 'characters'},
    {operator: minimum?.exclusive ? '>' : '>=', value: minimum?.value, unit: ''},
    {operator: maximum?.exclusive ? '<' : '<=', value: maximum?.value, unit: ''},
    {operator: '>=', value: props.schema.minItems, unit: 'items'},
    {operator: '<=', value: props.schema.maxItems, unit: 'items'},
  ].filter(bound => bound.value !== undefined)
})
</script>

<template>
  <div v-if="bounds.length || schema.uniqueItems === true" class="flex flex-wrap gap-1">
    <div v-for="(bound, index) in bounds" :key="index" class="rounded-md bg-gray-100 dark:bg-gray-800 px-[3px] py-0.5 text-xs leading-[15px] text-gray-600 dark:text-gray-400"><span class="[font-variant-ligatures:common-ligatures]">{{ bound.operator }}</span> {{ bound.value }} {{ bound.unit }}</div>
    <div v-if="schema.uniqueItems === true" class="rounded-md bg-gray-100 dark:bg-gray-800 px-[3px] py-0.5 text-xs leading-[15px] text-gray-600 dark:text-gray-400">unique items</div>
  </div>
  <SchemaAttribute v-if="schema.pattern !== undefined" title="Pattern" :value="schema.pattern" />
</template>
