<script setup lang="ts">
import {computed} from "vue";

const props = defineProps<{
  statusCode: string,
}>()

const responseDescriptionsList = {
  200: 'OK',
  201: 'Created',
  202: 'Accepted',
  204: 'No Content',
  301: 'Moved Permanently',
  302: 'Found',
  303: 'See Other',
  304: 'Not Modified',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  406: 'Not Acceptable',
  409: 'Conflict',
  410: 'Gone',
  415: 'Unsupported Media Type',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  501: 'Not Implemented',
  502: 'Bad Gateway',
}

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
  return responseDescriptionsList[props.statusCode] ?? ''
})
</script>

<template>
  <div class="flex items-baseline gap-1.5 text-sm">
    <div class="font-jetbrains-mono rounded-lg leading-[18px] font-medium uppercase" :class="statusCodeClasses">
      {{ statusCode }}
    </div>
    <template v-if="responseDescription">
      <div class="text-gray-300 shrink-0">·</div>
      <div class="text-gray-500 shrink-0">{{ responseDescription }}</div>
    </template>
    <slot/>
  </div>
</template>
