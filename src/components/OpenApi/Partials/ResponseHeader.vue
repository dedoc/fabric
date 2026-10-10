<script setup lang="ts">
import {computed} from "vue";
import {responseStatusDescription} from '../responseStatus'

const props = defineProps<{
  statusCode: string,
}>()

// gets the tw classes (style) of the status code based on the first character
// e.g. 2xx -> text-green-600
const statusCodeClasses = computed(() => {
  if (props.statusCode[0] === '2') {
    return 'border border-green-300 bg-green-50 text-green-600 px-1.5 py-[3px]'
  }
  if (props.statusCode[0] === '4') {
    return 'text-orange-600'
  }
  if (props.statusCode[0] === '5') {
    return 'text-red-600'
  }
  return 'text-gray-600'
})

const responseDescription = computed(() => {
  return responseStatusDescription(props.statusCode)
})
</script>

<template>
  <div class="flex flex-wrap items-center gap-x-2 gap-y-2 text-base sm:text-sm">
    <div class="font-jetbrains-mono rounded-lg leading-[18px] font-medium uppercase shrink-0" :class="statusCodeClasses">
      {{ statusCode }}
    </div>
    <template v-if="responseDescription">
      <div class="text-gray-300 shrink-0">·</div>
      <div class="min-w-0 text-gray-500">{{ responseDescription }}</div>
    </template>
    <slot/>
  </div>
</template>
