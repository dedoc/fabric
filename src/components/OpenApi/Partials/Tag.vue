<script setup lang="ts">
import type {Tag as OpenApiTag} from '@/core/openapi/types'

defineProps<{tag: OpenApiTag}>()
</script>

<template>
  <span
    class="inline-flex items-center text-sm"
    :class="tag.kind === 'badge'
      ? 'rounded-full border border-[color:color-mix(in_srgb,var(--primary)_35%,transparent)] bg-[color:color-mix(in_srgb,var(--primary)_6%,transparent)] px-1.5 py-[3px] leading-[18px] text-[color:var(--primary)]'
      : 'text-gray-500 dark:text-gray-400'"
  >{{ tag.kind === 'audience' ? 'Audience: ' : '' }}{{ tag.summary ?? tag.name }}</span>
</template>
