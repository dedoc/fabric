<script setup lang="ts">
withDefaults(defineProps<{
  label: string,
  active?: boolean,
  alignment?: 'center' | 'baseline',
}>(), {active: false, alignment: 'center'})
</script>

<template>
  <button
      type="button"
      class="relative isolate flex w-full cursor-pointer gap-2.5 rounded-[--navigation-item-radius] px-2 pt-[--navigation-item-padding-y] pb-[calc(var(--navigation-item-padding-y)+1px)] text-left text-sm after:pointer-events-none after:absolute after:inset-x-0 after:top-0 after:bottom-px after:-z-10 after:rounded-[--navigation-item-radius] after:content-[''] hover:after:bg-[--navigation-item-highlight] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500"
      :class="[
        alignment === 'baseline' ? 'items-baseline' : 'items-center',
        active ? 'after:bg-[--navigation-item-highlight] text-gray-900' : 'text-gray-600',
      ]"
  >
    <span class="min-w-0 flex-1 truncate">{{ label }}</span>
    <slot name="trailing" />
  </button>
</template>
