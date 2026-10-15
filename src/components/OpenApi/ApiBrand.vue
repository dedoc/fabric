<script setup lang="ts">
import {computed, ref, watch} from 'vue'
import type {Document} from './types'
import type {LogoConfig} from '../../types'
import {theme} from '../../utils/theme'

const props = withDefaults(defineProps<{info?: Document['info'], documentUrl?: string, logo?: LogoConfig | false}>(), {logo: undefined})
const failed = ref(false)
const configured = computed(() => props.logo !== undefined)
const config = computed(() => props.logo || undefined)
const specLogo = computed(() => props.info?.['x-logo'])

function safeUrl(value?: string, base = props.documentUrl): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined
  try {
    const url = new URL(value, base)
    return ['http:', 'https:'].includes(url.protocol) ? url.href : undefined
  } catch { return undefined }
}
const hostUrl = () => typeof window !== 'undefined' ? window.location.href : undefined
const source = computed(() => {
  if (!configured.value) return safeUrl(specLogo.value?.url)
  const image = config.value?.image
  return safeUrl(theme.value === 'dark' ? image?.srcDark ?? image?.src : image?.src, hostUrl())
})
const showImage = computed(() => !!source.value && !failed.value)
const visibleTitle = computed(() => {
  if (configured.value && !config.value?.image) return config.value?.title || props.info?.title
  return showImage.value ? config.value?.title : config.value?.title || props.info?.title
})
const alt = computed(() => configured.value ? config.value?.image?.alt ?? props.info?.title ?? '' : specLogo.value?.altText ?? 'logo')
const height = computed(() => {
  const value = config.value?.image?.height
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 36
})
const href = computed(() => {
  if (!configured.value) return safeUrl(specLogo.value?.href ?? props.info?.contact?.url)
  if (config.value?.href === false) return undefined
  return config.value?.href === undefined ? '#overview' : safeUrl(config.value.href, hostUrl())
})
const target = computed(() => href.value ? configured.value ? config.value?.target ?? '_self' : '_blank' : undefined)
const backgroundColor = computed(() => {
  const color = configured.value ? undefined : specLogo.value?.backgroundColor
  return typeof color === 'string' && /^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(color) ? color : undefined
})
watch([source, () => props.info, () => props.logo], () => { failed.value = false })
</script>

<template>
  <div class="min-w-0 flex-1 md:w-full md:flex-none">
    <component v-if="logo !== false" :is="href && (configured || showImage) ? 'a' : 'div'" :href="href && (configured || showImage) ? href : undefined" :target="target" :rel="target === '_blank' ? 'noopener noreferrer' : undefined" class="flex w-fit max-w-full items-center gap-2 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500" :class="{'dark:bg-white dark:px-2': !configured && showImage}" :style="{backgroundColor}">
      <img v-if="showImage" :key="source" :src="source" :alt="visibleTitle ? alt : alt || info?.title" :style="{height: `${height}px`}" class="block min-w-0 max-w-full shrink object-contain object-left" @error="failed = true">
      <span v-if="visibleTitle" class="min-w-0 line-clamp-2 text-base font-semibold leading-tight md:text-lg md:leading-tight">{{ visibleTitle }}</span>
    </component>
  </div>
</template>
