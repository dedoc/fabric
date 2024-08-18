<script setup lang="ts">
import {computed} from "vue";

const props = defineProps<{
  method: string,
}>()

const twClasses = computed(() => {
  return {
    get: 'text-green-700',
    post: 'text-blue-700',
    put: 'text-orange-700',
    delete: 'text-red-700',
    options: 'text-purple-700',
    head: 'text-gray-700',
    patch: 'text-yellow-700',
    trace: 'text-gray-700',
  }[props.method] ?? 'text-gray-600'
})
</script>

<template>
  <div class="font-jetbrains-mono uppercase" :class="twClasses">{{ method }}</div>
</template>
