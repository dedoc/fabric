<script setup lang="ts">
const props = defineProps<{
  title: string,
  value: unknown,
  description?: string,
}>()

function formatValue(value: unknown): string {
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
    <div class="w-14 shrink-0 whitespace-nowrap text-gray-500 dark:text-gray-400 sm:w-12">{{ title }}</div>
    <div class="min-w-0" :class="$slots.default ? 'leading-relaxed' : 'flex flex-wrap items-baseline gap-1'">
      <template v-if="Array.isArray(value)">
        <div
          v-for="(item, index) in value"
          :key="`${item}-${index}`"
          class="inline-block max-w-full break-words rounded bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 text-gray-600 dark:text-gray-400"
          :class="{'mr-1': $slots.default}"
        >
          {{ formatValue(item) }}
        </div>
      </template>
      <div v-else class="inline-block max-w-full break-words rounded bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 text-gray-600 dark:text-gray-400">{{ formatValue(value) }}</div>
      <slot>
        <div v-if="description" class="text-gray-500 dark:text-gray-400">{{ description }}</div>
      </slot>
    </div>
  </div>
</template>

<style scoped>

</style>
