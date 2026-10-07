<script setup lang="ts">
type AttributeValue = string | number | boolean | null | AttributeValue[] | {[key: string]: AttributeValue}

const props = defineProps<{
  title: string,
  value: AttributeValue,
  description?: string,
}>()

function formatValue(value: AttributeValue): string {
  if (value === '') {
    return '\'\''
  }
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  return String(value)
}
</script>

<template>
  <div class="flex items-baseline gap-2.5 text-sm sm:text-xs">
    <div class="w-14 shrink-0 whitespace-nowrap text-gray-500 sm:w-12">{{ title }}</div>
    <div class="flex min-w-0 flex-wrap items-baseline gap-1">
      <template v-if="Array.isArray(value)">
        <div
          v-for="(item, index) in value"
          :key="`${item}-${index}`"
          class="max-w-full break-words rounded bg-gray-100 px-1.5 py-0.5 text-gray-600"
        >
          {{ formatValue(item) }}
        </div>
      </template>
      <div v-else class="max-w-full break-words rounded bg-gray-100 px-1.5 py-0.5 text-gray-600">{{ formatValue(value) }}</div>
      <div v-if="description" class="text-gray-500">{{ description }}</div>
    </div>
  </div>
</template>

<style scoped>

</style>
