<script setup lang="ts">
const props = defineProps<{
  label: string,
  expanded: boolean,
}>()

const emit = defineEmits<{
  (e: 'update:expanded', expanded: boolean): void,
}>()
</script>

<template>
  <div
      class="text-xs text-gray-500 hover:text-gray-900 inline-block rounded-full p-1 px-3 border cursor-pointer"
      :class="{'border-transparent mb-1 text-gray-400': expanded}"
      @click="emit('update:expanded', !expanded)"
  >
    {{ expanded ? '- Hide' : '+ Show' }} {{ label }}
  </div>
</template>
