<script setup lang="ts">
defineProps<{message: string}>()
defineEmits<{retry: []}>()
</script>

<template>
  <main class="grid min-h-dvh place-items-center px-6 py-12">
    <div class="w-full max-w-sm space-y-4" role="alert">
      <p class="text-sm text-gray-500 dark:text-gray-400">API reference</p>
      <h1 class="text-balance text-2xl font-medium tracking-tight text-gray-900 dark:text-gray-100">Unable to display this API</h1>
      <p class="text-pretty text-sm leading-normal text-gray-600 dark:text-gray-400">{{ message }}</p>
      <button type="button" class="min-h-10 rounded-[--radius] border border-gray-950/10 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 hover:dark:bg-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500" @click="$emit('retry')">Try again</button>
    </div>
  </main>
</template>
