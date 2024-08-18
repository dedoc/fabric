<script setup lang="ts">
const props = defineProps<{
  title: string,
  value: string,
  description?: string,
}>()
</script>

<template>
  <div class="flex gap-[10px] items-baseline">
    <div class="text-gray-500 text-xs shrink-0 w-12">{{ title }}</div>
    <div class="flex gap-1 items-baseline">
      <div class="bg-gray-100 rounded-md py-0.5 px-[3px] text-gray-600 text-xs">{{ value }}</div>
      <div v-if="description" class="text-gray-500 text-xs">{{ description }}</div>
    </div>
  </div>
</template>

<style scoped>

</style>
