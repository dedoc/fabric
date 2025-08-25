<script setup lang="ts">
import type {Components, Operation} from "../types.ts";
import {computed, inject} from "vue";
import {documentKey} from "../../../utils/symbols.ts";

const props = defineProps<{
  operation: Operation,
}>()

const document = inject(documentKey)

const security = computed(() => {
  if (typeof props.operation.security !== 'undefined') {
    return props.operation.security
  }

  return document?.value?.security ?? []
})

</script>

<template>
  <pre class="text-xs">{{security}}</pre>
  <div>
    <div v-if="!('security' in operation)" class="p-3 rounded-lg flex gap-2 text-sm items-center border">
      <div>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3.5 15.5L5 16H14V8.5H5L3.5 9.5V15.5Z" fill="#0F1729" fill-opacity="0.3"/>
          <path
              d="M12.375 7.875V5.0625C12.375 3.19854 10.864 1.6875 9 1.6875C7.13604 1.6875 5.625 3.19854 5.625 5.0625V7.875M5.0625 16.3125H12.9375C13.8695 16.3125 14.625 15.557 14.625 14.625V9.5625C14.625 8.63052 13.8695 7.875 12.9375 7.875H5.0625C4.13052 7.875 3.375 8.63052 3.375 9.5625V14.625C3.375 15.557 4.13052 16.3125 5.0625 16.3125Z"
              stroke="#0F172A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div>Security: Bearer Auth</div>
    </div>
  </div>
</template>
