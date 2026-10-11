<script setup lang="ts">
import {computed, ref} from 'vue'
import type {Components, Operation, RequestBody, Response} from './types'
import {useReferences} from './useReferences'
import ReferenceDiagnostics from './ReferenceDiagnostics.vue'
import type {ReferenceIssue} from './references'
import MethodChip from './Partials/MethodChip.vue'
import {formatMediaExample, isJsonContentType, isXmlContentType, selectMediaExample} from './mediaExamples'
import {createRequestExample, requestExampleSenders} from './requestExamples'
import {useMediaType} from './useMediaType'
import Select from '../UI/Select.vue'
import Description from './Description.vue'
import {useCompositionExample} from './useCompositionSelections'
import {useStoredChoice} from './useStoredChoice'
import HighlightedCode from './HighlightedCode.vue'
import {authorizationHeaderExample} from './security'

const props = defineProps<{base: string, components: Components, path: string, method: string, operation: Operation, webhookName?: string}>()
const references = useReferences(() => props.components)
const requestView = ref('example')
const preferredRequestExample = useStoredChoice('fabric:request-sender', requestExampleSenders.map(sender => sender.id), requestExampleSenders[0].id)
const responseView = ref('example')
const responseStatus = ref(Object.keys(props.operation.responses ?? {})[0] ?? '')
const copied = ref('')
const copyError = ref('')
const requestBody = computed(() => references.resolve<RequestBody>(props.operation.requestBody))
const {type: requestType, media: originalRequestMedia} = useMediaType(() => requestBody.value.value?.content, () => 'request')
const requestMedia = useCompositionExample(() => originalRequestMedia.value, () => `request:${requestType.value}`, () => props.components)
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
const responseResolution = computed(() => {
  const entry = props.operation.responses?.[responseStatus.value]
  return references.resolve<Response>(entry)
})
const responseContent = computed(() => responseResolution.value.value?.content)
const {type: responseType, media: originalResponseMedia} = useMediaType(() => responseContent.value, () => `response:${responseStatus.value}`)
const responseMedia = useCompositionExample(() => originalResponseMedia.value, () => `response:${responseStatus.value}:${responseType.value}`, () => props.components)
const namedSelections = ref<Record<string, string>>({})
const requestKey = computed(() => `request:${requestType.value}`)
const responseKey = computed(() => `response:${responseStatus.value}:${responseType.value}`)
function namedOptions(media: typeof requestMedia.value) {
  return Object.entries(media?.examples ?? {}).map(([value, entry]) => ({value, label: references.resolve<{summary?: string}>(entry).value?.summary ?? value}))
}
const requestSample = computed(() => {
  try {
    const selected = selectMediaExample(requestMedia.value, namedSelections.value[requestKey.value], references.document.value)
    const model = createRequestExample(props.base, props.path, props.method, requestType.value, selected.media, props.components, references.document.value, props.operation.parameters ?? [])
    return {...selected, model, error: ''}
  } catch (error) { return {model: undefined, source: '', description: '', error: error instanceof Error ? error.message : String(error)} }
})
const responseSample = computed(() => {
  try {
    const selected = selectMediaExample(responseMedia.value, namedSelections.value[responseKey.value], references.document.value)
    return {...selected, code: formatMediaExample(selected.media, responseType.value, props.components, true, references.document.value, undefined, 'response'), error: ''}
  } catch (error) { return {code: '', source: '', description: '', error: error instanceof Error ? error.message : String(error)} }
})
function mediaIssues(media: typeof requestMedia.value, type: string): ReferenceIssue[] {
  const issues: ReferenceIssue[] = []
  try { formatMediaExample(media, type, props.components, true, references.document.value, issue => issues.push(issue)) } catch { /* Sample errors are displayed separately. */ }
  return issues
}
const requestIssues = computed(() => [...requestBody.value.issues, ...mediaIssues(requestMedia.value, requestType.value)])
const responseIssues = computed(() => [...responseResolution.value.issues, ...mediaIssues(responseMedia.value, responseType.value)])
function format(value: unknown): string {
  return value === undefined ? '' : JSON.stringify(value, null, 2)
}
const requestCode = computed(() => {
  if (requestIssues.value.length && requestView.value !== 'schema') return ''
  if (requestView.value === 'schema') return format(originalRequestMedia.value?.schema)
  if (!requestSample.value.model) return ''
  const request = requestSample.value.model
  if (requestExample.value === 'payload') return request.body
  const authorization = authorizationHeaderExample(props.operation, references.document.value)
  const headers = request.headers ?? []
  const sender = requestExampleSenders.find(sender => sender.id === requestExample.value) ?? requestExampleSenders[0]
  return sender.generate({...request, headers: authorization && !headers.some(([name]) => name.toLowerCase() === 'authorization')
    ? [...headers, ['Authorization', authorization]] : headers})
})
function mediaLanguage(type: string) {
  return isJsonContentType(type) ? 'json' : isXmlContentType(type) ? 'xml' : 'text'
}
const requestLanguage = computed(() => requestView.value === 'schema' ? 'json' : requestExample.value === 'payload' ? mediaLanguage(requestType.value) : requestExample.value === 'laravel' ? 'php' : 'bash')
const responseLanguage = computed(() => responseView.value === 'schema' ? 'json' : mediaLanguage(responseType.value))
const responseCode = computed(() => {
  if (responseView.value === 'schema') return format(originalResponseMedia.value?.schema)
  if (responseIssues.value.length) return ''
  return responseSample.value.code
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
      <section class="flex max-h-[28rem] min-h-0 min-w-0 shrink-0 flex-col overflow-hidden rounded-xl border border-[color:var(--schema-border-color)] dark:bg-[#111111] text-sm sm:text-xs min-[1200px]:max-h-[40dvh]" aria-label="Request example">
        <div class="flex min-h-12 shrink-0 flex-wrap items-center gap-x-2 gap-y-1 border-b border-[color:var(--schema-border-color)] px-4 py-2">
          <div class="flex min-w-0 flex-1 items-center gap-2"><MethodChip class="shrink-0 whitespace-nowrap" :method="method" /><span class="truncate text-gray-500 dark:text-gray-400" :title="webhookName ?? path">{{ webhookName ?? path }}</span></div>
          <span v-if="requestView === 'schema'" class="shrink-0 text-gray-600 dark:text-gray-400">JSON</span>
          <Select v-else v-model="requestExample" :options="requestExampleOptions" class="shrink-0 whitespace-nowrap" aria-label="Request example sender" />
          <Select class="shrink-0 whitespace-nowrap" v-model="requestView" :options="[{value: 'example', label: 'Example'}, {value: 'schema', label: 'Schema'}]" aria-label="Request example or schema" />
          <button type="button" class="copy-button disabled:cursor-default disabled:opacity-40" :disabled="!requestCode" :aria-label="copied === 'request' ? 'Copied request' : 'Copy request example'" @click="copy(requestCode, 'request')">
            <span v-if="copied === 'request'">✓</span>
            <svg v-else class="size-[18px]" viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="7" y="3" width="9" height="11" rx="2" stroke="currentColor"/><path d="M12 14v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h3" stroke="currentColor"/></svg>
          </button>
        </div>
        <ReferenceDiagnostics :issues="requestIssues" />
        <div v-if="requestView === 'example' && namedOptions(requestMedia).length" class="flex max-h-32 shrink-0 flex-col items-start gap-1 overflow-auto px-4 pt-2 text-gray-500 dark:text-gray-400 [scrollbar-width:thin] [&+pre]:pt-2">
          <Select v-model="namedSelections[requestKey]" :options="namedOptions(requestMedia)" class="max-w-full text-gray-600 dark:text-gray-400" aria-label="Named request example" />
          <Description v-if="requestSample.description" class="text-sm leading-5 text-gray-500 dark:text-gray-400 sm:text-xs" :content="requestSample.description" />
        </div>
        <p v-if="requestView === 'example' && requestSample.error" role="note" class="shrink-0 p-4 leading-5 text-amber-700 dark:text-amber-400">{{ requestSample.error }}</p>
        <pre tabindex="0" class="m-0 min-h-0 overflow-auto overscroll-contain [scrollbar-width:thin] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-500 p-4 font-jetbrains-mono text-sm leading-6 text-[#435a78] dark:text-gray-300 sm:text-xs sm:leading-5 [tab-size:2]" v-if="requestCode"><HighlightedCode :code="requestCode" :language="requestLanguage" /></pre>
        <p v-else-if="requestView === 'schema' || !requestSample.error" class="p-4 leading-5 text-gray-500 dark:text-gray-400">{{ requestView === 'schema' ? 'No schema provided.' : requestSample.model?.value === '' ? 'Empty example.' : 'No example provided.' }}</p>
      </section>
      <section class="flex max-h-[32rem] min-h-0 min-w-0 flex-auto flex-col overflow-hidden rounded-xl border border-[color:var(--schema-border-color)] dark:bg-[#111111] text-sm sm:text-xs min-[1200px]:max-h-none" aria-label="Response example">
        <div class="flex min-h-12 shrink-0 flex-wrap items-center gap-x-2 gap-y-1 border-b border-[color:var(--schema-border-color)] px-4 py-2">
          <div class="flex min-w-0 flex-1 items-center gap-2"><span>Output</span><span v-if="responseType" class="min-w-0 truncate text-gray-500 dark:text-gray-400" :title="responseType">{{ responseType }}</span></div>
          <Select class="shrink-0 whitespace-nowrap" v-if="responseStatus" v-model="responseStatus" :options="Object.keys(operation.responses ?? {}).map(value => ({value, label: value}))" aria-label="Response status" />
          <Select class="shrink-0 whitespace-nowrap" v-model="responseView" :options="[{value: 'example', label: 'Example'}, {value: 'schema', label: 'Schema'}]" aria-label="Response example or schema" />
          <button type="button" class="copy-button disabled:cursor-default disabled:opacity-40" :disabled="!responseCode" :aria-label="copied === 'response' ? 'Copied response' : 'Copy response example'" @click="copy(responseCode, 'response')">
            <span v-if="copied === 'response'">✓</span>
            <svg v-else class="size-[18px]" viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="7" y="3" width="9" height="11" rx="2" stroke="currentColor"/><path d="M12 14v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h3" stroke="currentColor"/></svg>
          </button>
        </div>
        <ReferenceDiagnostics :issues="responseIssues" />
        <div v-if="responseView === 'example' && namedOptions(responseMedia).length" class="flex max-h-32 shrink-0 flex-col items-start gap-1 overflow-auto px-4 pt-2 text-gray-500 dark:text-gray-400 [scrollbar-width:thin] [&+pre]:pt-2">
          <Select v-model="namedSelections[responseKey]" :options="namedOptions(responseMedia)" class="max-w-full text-gray-600 dark:text-gray-400" aria-label="Named response example" />
          <Description v-if="responseSample.description" class="text-sm leading-5 text-gray-500 dark:text-gray-400 sm:text-xs" :content="responseSample.description" />
        </div>
        <p v-if="responseView === 'example' && responseSample.error" role="note" class="shrink-0 p-4 leading-5 text-amber-700 dark:text-amber-400">{{ responseSample.error }}</p>
        <pre tabindex="0" class="m-0 min-h-0 flex-auto overflow-auto overscroll-contain [scrollbar-width:thin] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-500 p-4 font-jetbrains-mono text-sm leading-6 text-[#435a78] dark:text-gray-300 sm:text-xs sm:leading-5 [tab-size:2]" v-if="responseCode"><HighlightedCode :code="responseCode" :language="responseLanguage" /></pre>
        <p v-else-if="responseView === 'schema' || !responseSample.error" class="p-4 leading-5 text-gray-500 dark:text-gray-400">{{ responseView === 'schema' ? 'No schema provided.' : responseSample.source === 'Supplied example' ? 'Empty example.' : 'No example provided.' }}</p>
      </section>
      <p class="sr-only" role="status">{{ copied ? 'Example copied.' : copyError }}</p>
    </div>
  </aside>
</template>
