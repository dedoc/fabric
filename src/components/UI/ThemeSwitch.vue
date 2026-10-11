<script setup lang="ts">
import {setTheme, theme} from '../../utils/theme'
</script>

<template>
  <button
    type="button"
    role="switch"
    aria-label="Dark theme"
    :aria-checked="theme === 'dark'"
    :title="theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'"
    class="ml-auto flex min-h-9 shrink-0 items-center rounded-full px-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500"
    @click="setTheme(theme === 'dark' ? 'light' : 'dark')"
  >
    <span class="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition-colors dark:bg-gray-700">
      <span class="grid size-5 translate-x-0.5 place-items-center rounded-full bg-white text-gray-600 transition-transform dark:translate-x-[22px] dark:bg-gray-200 dark:text-gray-800">
        <svg v-if="theme === 'light'" class="size-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="10" cy="10" r="3"/><path d="M10 1v2m0 14v2M1 10h2m14 0h2M3.6 3.6 5 5m10 10 1.4 1.4M3.6 16.4 5 15M15 5l1.4-1.4"/></svg>
        <svg v-else class="size-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M17 11.5A7.5 7.5 0 0 1 8.5 3a7.5 7.5 0 1 0 8.5 8.5Z"/></svg>
      </span>
    </span>
  </button>
</template>
