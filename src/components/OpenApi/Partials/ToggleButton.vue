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
  <button
      type="button"
      class="min-h-8 self-start rounded-full border border-gray-950/10 px-2.5 py-1 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      :aria-expanded="expanded"
      @click="emit('update:expanded', !expanded)"
  >
    {{ expanded ? '- Hide' : '+ Show' }} {{ label }}
  </button>
</template>
