<script setup lang="ts">
import type {Components, Operation} from "../types.ts";
import {computed, inject} from "vue";
import {documentKey} from "../../../utils/symbols.ts";

const props = defineProps<{
  operation: Operation,
}>()

const document = inject(documentKey)
if (! document) {
  throw new Error('document must be provided')
}

const security = computed(() => {
  if (typeof props.operation.security !== 'undefined') {
    return props.operation.security
  }
  return document.value.security ?? []
})

const hasDatums = computed(() => !! security.value.length)
</script>

<template>
  <div v-if="hasDatums">
    <div v-for="s of security" class="flex gap-1 text-sm text-gray-500 items-center">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="size-3.5 text-gray-400">
        <path fill-rule="evenodd" d="M8 1a3.5 3.5 0 0 0-3.5 3.5V7A1.5 1.5 0 0 0 3 8.5v5A1.5 1.5 0 0 0 4.5 15h7a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 11.5 7V4.5A3.5 3.5 0 0 0 8 1Zm2 6V4.5a2 2 0 1 0-4 0V7h4Z" clip-rule="evenodd" />
      </svg>
      <div>
        Auth: Bearer token
      </div>
    </div>
  </div>
</template>
