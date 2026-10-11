<script setup lang="ts">
import {computed, ref, watch} from 'vue'
import type {Document} from './types'

const props = defineProps<{info?: Document['info'], documentUrl?: string}>()
const failed = ref(false)
const logo = computed(() => props.info?.['x-logo'])

function safeUrl(value?: string): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined
  try {
    const url = new URL(value, props.documentUrl)
    return ['http:', 'https:'].includes(url.protocol) ? url.href : undefined
  } catch { return undefined }
}
const source = computed(() => safeUrl(logo.value?.url))
const href = computed(() => safeUrl(logo.value?.href ?? props.info?.contact?.url))
const backgroundColor = computed(() => {
  const color = logo.value?.backgroundColor
  return typeof color === 'string' && /^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(color) ? color : undefined
})
watch(source, () => { failed.value = false })
</script>

<template>
  <div class="min-w-0 flex-1 md:w-full md:flex-none">
    <component :is="href ? 'a' : 'div'" v-if="source && !failed" :href="href" :target="href ? '_blank' : undefined" :rel="href ? 'noopener noreferrer' : undefined" class="flex h-9 w-fit max-w-full items-center rounded-sm dark:bg-white dark:px-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500" :style="{backgroundColor}">
      <img :src="source" :alt="logo?.altText || 'logo'" class="block max-h-9 max-w-full object-contain object-left" @error="failed = true">
    </component>
    <div v-else class="truncate text-base font-semibold md:text-lg">{{ info?.title ?? '' }}</div>
  </div>
</template>
