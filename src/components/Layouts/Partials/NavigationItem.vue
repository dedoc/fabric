<script setup lang="ts">
withDefaults(defineProps<{
  label: string,
  href?: string,
  active?: boolean,
  alignment?: 'center' | 'baseline',
}>(), {active: false, alignment: 'center'})
</script>

<template>
  <component
      :is="href ? 'a' : 'button'"
      :href="href"
      :type="href ? undefined : 'button'"
      class="relative isolate flex min-h-12 w-full cursor-pointer gap-2.5 rounded-[--navigation-item-radius] px-2 py-2 text-left text-base md:min-h-8 md:py-[--navigation-item-padding-y] md:text-sm after:pointer-events-none after:absolute after:inset-x-0 after:top-0 after:bottom-px after:-z-10 after:rounded-[--navigation-item-radius] after:content-[''] hover:after:bg-[--navigation-item-highlight] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500"
      :class="[
        alignment === 'baseline' ? 'items-baseline' : 'items-center',
        active ? 'after:bg-[--navigation-item-highlight] text-gray-900' : 'text-gray-600',
      ]"
  >
    <span class="min-w-0 flex-1 truncate">{{ label }}</span>
    <slot name="trailing" />
  </component>
</template>
