<script setup lang="ts">
import {computed, ref} from 'vue'
import type {Components, Operation, Response} from './types'
import {unreference} from './utils'
import MethodChip from './Partials/MethodChip.vue'
import {formatMediaExample, isJsonContentType, isXmlContentType} from './mediaExamples'
import {createRequestExample, requestExampleSenders} from './requestExamples'
import {useMediaType} from './useMediaType'
import Select from '../UI/Select.vue'

const props = defineProps<{base: string, components: Components, path: string, method: string, operation: Operation}>()
const requestView = ref('example')
const preferredRequestExample = ref(requestExampleSenders[0].id)
const responseView = ref('example')
const responseStatus = ref(Object.keys(props.operation.responses ?? {})[0] ?? '')
const copied = ref('')
const copyError = ref('')
const {type: requestType, media: requestMedia} = useMediaType(() => props.operation.requestBody?.content, () => 'request')
const requestExampleOptions = computed(() => {
  const options = requestExampleSenders.map(({id, label}) => ({value: id, label}))
  if (isJsonContentType(requestType.value)) options.push({value: 'payload', label: 'JSON'})
  else if (isXmlContentType(requestType.value)) options.push({value: 'payload', label: 'XML'})
  return options
})
const requestExample = computed({
  get: () => requestExampleOptions.value.some(option => option.value === preferredRequestExample.value)
    ? preferredRequestExample.value : requestExampleSenders[0].id,
  set: (value: string) => { preferredRequestExample.value = value },
})
const responseContent = computed(() => {
  const entry = props.operation.responses?.[responseStatus.value]
  const response = entry && ('$ref' in entry ? unreference<Response>(entry.$ref, props.components) : entry)
  return response?.content
})
const {type: responseType, media: responseMedia} = useMediaType(() => responseContent.value, () => `response:${responseStatus.value}`)
function format(value: unknown): string {
  return value === undefined ? '' : JSON.stringify(value, null, 2)
}
const requestCode = computed(() => {
  if (requestView.value === 'schema') return format(requestMedia.value?.schema)
  const request = createRequestExample(props.base, props.path, props.method, requestType.value, requestMedia.value, props.components)
  if (requestExample.value === 'payload') return request.body
  const sender = requestExampleSenders.find(sender => sender.id === requestExample.value) ?? requestExampleSenders[0]
  return sender.generate(request)
})
const responseCode = computed(() => {
  const media = responseMedia.value
  if (responseView.value === 'schema') return format(media?.schema)
  return formatMediaExample(media, responseType.value, props.components)
})
async function copy(code: string, panel: string) {
  try {
    await navigator.clipboard.writeText(code)
    copied.value = panel
    copyError.value = ''
    window.setTimeout(() => { copied.value = '' }, 2000)
  } catch { copyError.value = 'Unable to copy. Select and copy the code manually.' }
}
</script>

<template>
  <aside class="col-start-1 min-w-0 self-stretch min-[1200px]:col-start-2 min-[1200px]:row-start-2" aria-label="Examples">
    <div class="flex flex-col gap-5 min-[1200px]:sticky min-[1200px]:top-8 min-[1200px]:max-h-[calc(100dvh-64px)]">
      <section class="flex max-h-[28rem] min-h-0 min-w-0 shrink-0 flex-col overflow-hidden rounded-xl border border-gray-950/10 text-sm sm:text-xs min-[1200px]:max-h-[40dvh]" aria-label="Request example">
        <div class="flex min-h-12 shrink-0 flex-wrap items-center gap-x-2 gap-y-1 border-b border-gray-950/10 px-4 py-2">
          <div class="flex min-w-0 flex-1 items-center gap-2"><MethodChip class="shrink-0 whitespace-nowrap" :method="method" /><span class="truncate text-gray-500" :title="path">{{ path }}</span></div>
          <span v-if="requestView === 'schema'" class="shrink-0 text-gray-600">JSON</span>
          <Select v-else v-model="requestExample" :options="requestExampleOptions" class="shrink-0 whitespace-nowrap" aria-label="Request example sender" />
          <Select class="shrink-0 whitespace-nowrap" v-model="requestView" :options="[{value: 'example', label: 'Example'}, {value: 'schema', label: 'Schema'}]" aria-label="Request example or schema" />
          <button type="button" class="copy-button disabled:cursor-default disabled:opacity-40" :disabled="!requestCode" :aria-label="copied === 'request' ? 'Copied request' : 'Copy request example'" @click="copy(requestCode, 'request')">
            <span v-if="copied === 'request'">✓</span>
            <svg v-else class="size-[18px]" viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="7" y="3" width="9" height="11" rx="2" stroke="currentColor"/><path d="M12 14v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h3" stroke="currentColor"/></svg>
          </button>
        </div>
        <pre tabindex="0" class="m-0 min-h-0 overflow-auto overscroll-contain [scrollbar-width:thin] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-500 p-4 text-sm leading-6 text-[#435a78] sm:text-xs sm:leading-5 [tab-size:2]" v-if="requestCode"><code>{{ requestCode }}</code></pre>
        <p v-else class="p-4 text-[13px] text-gray-500">{{ requestView === 'schema' ? 'No schema provided.' : 'No example provided.' }}</p>
      </section>
      <section class="flex max-h-[32rem] min-h-0 min-w-0 flex-auto flex-col overflow-hidden rounded-xl border border-gray-950/10 text-sm sm:text-xs min-[1200px]:max-h-none" aria-label="Response example">
        <div class="flex min-h-12 shrink-0 flex-wrap items-center gap-x-2 gap-y-1 border-b border-gray-950/10 px-4 py-2">
          <span>Output</span>
          <span v-if="responseType" class="min-w-0 flex-1 truncate text-gray-500" :title="responseType">{{ responseType }}</span>
          <Select class="shrink-0 whitespace-nowrap" v-if="responseStatus" v-model="responseStatus" :options="Object.keys(operation.responses ?? {}).map(value => ({value, label: value}))" aria-label="Response status" />
          <Select class="shrink-0 whitespace-nowrap" v-model="responseView" :options="[{value: 'example', label: 'Example'}, {value: 'schema', label: 'Schema'}]" aria-label="Response example or schema" />
          <button type="button" class="copy-button disabled:cursor-default disabled:opacity-40" :disabled="!responseCode" :aria-label="copied === 'response' ? 'Copied response' : 'Copy response example'" @click="copy(responseCode, 'response')">
            <span v-if="copied === 'response'">✓</span>
            <svg v-else class="size-[18px]" viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="7" y="3" width="9" height="11" rx="2" stroke="currentColor"/><path d="M12 14v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h3" stroke="currentColor"/></svg>
          </button>
        </div>
        <pre tabindex="0" class="m-0 min-h-0 flex-auto overflow-auto overscroll-contain [scrollbar-width:thin] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-500 p-4 text-sm leading-6 text-[#435a78] sm:text-xs sm:leading-5 [tab-size:2]" v-if="responseCode"><code>{{ responseCode }}</code></pre>
        <p v-else class="p-4 text-[13px] text-gray-500">{{ responseView === 'schema' ? 'No schema provided.' : 'No example provided.' }}</p>
      </section>
      <p class="sr-only" role="status">{{ copied ? 'Example copied.' : copyError }}</p>
    </div>
  </aside>
</template>
