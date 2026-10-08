<script setup lang="ts">
defineProps<{message: string}>()
defineEmits<{retry: []}>()
</script>

<template>
  <main class="grid min-h-dvh place-items-center px-6 py-12">
    <div class="w-full max-w-sm space-y-4" role="alert">
      <p class="text-sm text-gray-500">API reference</p>
      <h1 class="text-balance text-2xl font-medium tracking-tight text-gray-900">Unable to display this API</h1>
      <p class="text-pretty text-sm leading-normal text-gray-600">{{ message }}</p>
      <button type="button" class="min-h-10 rounded-xl border border-gray-950/10 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500" @click="$emit('retry')">Try again</button>
    </div>
  </main>
</template>
