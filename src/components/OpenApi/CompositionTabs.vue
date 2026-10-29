<script setup lang="ts">
import {getSchemaTypeParts} from '@/core/openapi/schemaTypePreview'
import {computed} from 'vue'
import type {Schema} from '@/core/openapi/types'

const props = defineProps<{members: Schema[], kind: 'anyOf' | 'oneOf', selected: number, panelId: string}>()
const emit = defineEmits<{select: [index: number]}>()
const label = computed(() => props.kind === 'anyOf' ? 'any of' : 'one of')
function selectTab(index: number, event: KeyboardEvent) {
  const next = event.key === 'ArrowRight' ? (index + 1) % props.members.length
    : event.key === 'ArrowLeft' ? (index + props.members.length - 1) % props.members.length
    : event.key === 'Home' ? 0 : event.key === 'End' ? props.members.length - 1 : undefined
  if (next === undefined) return
  event.preventDefault()
  emit('select', next)
  const buttons = (event.currentTarget as HTMLElement).parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
  buttons?.[next]?.focus()
}
</script>

<template>
  <span class="inline-flex max-w-full flex-wrap items-baseline gap-y-1 text-gray-500 dark:text-gray-400" role="tablist" :aria-label="label">
    <span class="mr-1">{{ label }}</span>
    <button v-for="(member, index) in members" :id="`${panelId}-tab-${index}`" :key="index" type="button" role="tab" :aria-selected="selected === index" :aria-controls="panelId" :tabindex="selected === index ? 0 : -1" class="inline-flex h-[1lh] max-w-full items-center rounded-[--radius] px-2 py-0 align-baseline leading-[inherit] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500" :class="selected === index ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 hover:dark:bg-gray-900 hover:text-gray-900 hover:dark:text-gray-100'" @click="emit('select', index)" @keydown="selectTab(index, $event)">{{ member.title || getSchemaTypeParts(member).map(part => part.text).join('') }}</button>
  </span>
</template>
