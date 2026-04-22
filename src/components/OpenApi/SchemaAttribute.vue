<script setup lang="ts">
type AttributeValue = string | number | boolean | null

const props = defineProps<{
  title: string,
  value: AttributeValue | AttributeValue[],
  description?: string,
}>()

function formatValue(value: AttributeValue): string {
  if (value === '') {
    return '\'\''
  }
  return String(value)
}
</script>

<template>
  <div class="flex gap-[10px] items-baseline">
    <div class="text-gray-500 text-xs shrink-0 w-12">{{ title }}</div>
    <div class="flex gap-1 items-baseline flex-wrap">
      <template v-if="Array.isArray(value)">
        <div
          v-for="(item, index) in value"
          :key="`${item}-${index}`"
          class="bg-gray-100 rounded-md py-0.5 px-[3px] text-gray-600 text-xs"
        >
          {{ formatValue(item) }}
        </div>
      </template>
      <div v-else class="bg-gray-100 rounded-md py-0.5 px-[3px] text-gray-600 text-xs">{{ formatValue(value) }}</div>
      <div v-if="description" class="text-gray-500 text-xs">{{ description }}</div>
    </div>
  </div>
</template>

<style scoped>

</style>
