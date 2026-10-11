<script setup lang="ts">
import {computed} from "vue";

const props = defineProps<{
  method: string,
}>()

const twClasses = computed(() => {
  return {
    get: 'text-green-700 dark:text-green-400',
    post: 'text-blue-700 dark:text-blue-400',
    put: 'text-violet-700 dark:text-violet-400',
    delete: 'text-red-700 dark:text-red-400',
    options: 'text-purple-700 dark:text-purple-400',
    head: 'text-gray-700 dark:text-gray-300',
    patch: 'text-yellow-700 dark:text-yellow-400',
    trace: 'text-gray-700 dark:text-gray-300',
  }[props.method] ?? 'text-gray-600 dark:text-gray-400'
})
</script>

<template>
  <div class="font-jetbrains-mono uppercase" :class="twClasses"><slot />{{ method }}</div>
</template>
