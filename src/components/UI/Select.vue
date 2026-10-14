<script setup lang="ts">
import {computed, ref, useAttrs} from 'vue'
import type {StyleValue} from 'vue'

defineOptions({inheritAttrs: false})
const props = defineProps<{options: {value: string, label: string}[]}>()
const value = defineModel<string>()
const attrs = useAttrs()
const pointerFocused = ref(false)
const keyboardFocused = ref(false)
const selectedLabel = computed(() => props.options.find(option => option.value === value.value)?.label ?? props.options[0]?.label ?? '')
function selectAttrs() {
  return Object.fromEntries(Object.entries(attrs).filter(([key]) => key !== 'class' && key !== 'style'))
}
</script>

<template>
  <span class="relative inline-flex min-h-8 min-w-0 items-center gap-1.5 rounded-[--radius]" :class="[attrs.class, {'outline outline-2 outline-offset-2 outline-gray-500': keyboardFocused}]" :style="attrs.style as StyleValue" :title="attrs.title as string | undefined">
    <span class="pointer-events-none min-w-0 truncate">{{ selectedLabel }}</span>
    <template v-if="options.length > 1">
      <svg class="pointer-events-none size-3 shrink-0" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m4 6 4 4 4-4" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" /></svg>
      <select v-model="value" v-bind="selectAttrs()" :name="String(attrs.name ?? attrs['aria-label'] ?? 'selection')" class="absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-[--radius] border-0 bg-transparent p-0 opacity-0" @pointerdown="pointerFocused = true; keyboardFocused = false" @focus="keyboardFocused = !pointerFocused" @keydown="keyboardFocused = true" @blur="pointerFocused = false; keyboardFocused = false">
        <option v-for="option of options" :key="option.value" :value="option.value" :selected="option.value === value">{{ option.label }}</option>
      </select>
    </template>
  </span>
</template>
