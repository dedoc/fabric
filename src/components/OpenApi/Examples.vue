<script setup lang="ts">
import {computed, ref} from 'vue'
import type {Components, Example, MediaType, Operation, Response} from './types'
import {unreference} from './utils'
import MethodChip from './Partials/MethodChip.vue'
import {createSchemaExample, resolveExampleSchema} from './schemaExamples'

const props = defineProps<{base: string, components: Components, path: string, method: string, operation: Operation}>()
const requestView = ref('example')
const requestLanguage = ref('bash')
const responseView = ref('example')
const responseStatus = ref(Object.keys(props.operation.responses ?? {})[0] ?? '')
const copied = ref('')
const copyError = ref('')
const requestMedia = computed(() => Object.entries(props.operation.requestBody?.content ?? {})[0])
const responseMedia = computed(() => {
  const entry = props.operation.responses?.[responseStatus.value]
  const response = entry && ('$ref' in entry ? unreference<Response>(entry.$ref, props.components) : entry)
  return Object.entries(response?.content ?? {})[0]
})
function example(media?: MediaType): unknown {
  if (!media) return undefined
  if (media.example !== undefined) return media.example
  const entry = Object.values(media.examples ?? {})[0]
  const value = entry && ('$ref' in entry ? unreference<Example>(entry.$ref, props.components) : entry)
  if (value?.value !== undefined) return value.value
  const schema = media.schema?.$ref ? unreference<MediaType['schema']>(media.schema.$ref, props.components) : media.schema
  if (schema?.example !== undefined || schema?.examples?.length) return createSchemaExample(schema)
  return undefined
}
function format(value: unknown): string {
  return value === undefined ? '' : JSON.stringify(value, null, 2)
}
const requestCode = computed(() => {
  if (requestView.value === 'schema') return format(requestMedia.value?.[1].schema)
  if (requestLanguage.value === 'json') return format(example(requestMedia.value?.[1]))
  const url = `${props.base.replace(/\/$/, '')}/${props.path.replace(/^\//, '')}`
  const quote = (text: string) => "'" + text.replace(/'/g, "'\\''") + "'"
  let code = `curl -X ${props.method.toUpperCase()} ${quote(url)}`
  if (requestMedia.value) code += ` \\\n  -H ${quote('Content-Type: ' + requestMedia.value[0])}`
  const body = example(requestMedia.value?.[1])
  if (body !== undefined) code += ` \\\n  -d ${quote(format(body))}`
  return code
})
const responseCode = computed(() => {
  const media = responseMedia.value?.[1]
  if (responseView.value === 'schema') return format(media?.schema)
  const provided = example(media)
  return format(provided !== undefined ? provided : createSchemaExample(resolveExampleSchema(media?.schema, props.components)))
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
    <div class="flex flex-col gap-4 min-[1200px]:sticky min-[1200px]:top-6 min-[1200px]:max-h-[calc(100dvh-48px)]">
      <section class="flex max-h-[40dvh] min-h-0 min-w-0 shrink-0 flex-col overflow-hidden rounded-xl border border-[#eeeeef] text-xs" aria-label="Request example">
        <div class="flex min-h-11 shrink-0 items-center gap-2 border-b border-[#eeeeef] px-3 py-2 md:px-4">
          <div class="flex min-w-0 items-center gap-2"><MethodChip class="shrink-0 whitespace-nowrap" :method="method" /><span class="truncate text-neutral-500" :title="path">{{ path }}</span></div>
          <span v-if="requestView === 'schema'" class="shrink-0 text-neutral-600">JSON</span>
          <select v-else v-model="requestLanguage" class="min-w-0 max-w-[62px] shrink-0 cursor-pointer bg-transparent text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-500" aria-label="Request example language"><option value="bash">Bash</option><option value="json">JSON</option></select>
          <select class="ml-auto min-w-0 max-w-[90px] cursor-pointer bg-transparent text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-500" v-model="requestView" aria-label="Request example or schema"><option value="example">Example</option><option value="schema">Schema</option></select>
          <button class="grid size-6 shrink-0 place-items-center rounded text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 disabled:cursor-default disabled:opacity-[.35] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-500" :disabled="!requestCode" :aria-label="copied === 'request' ? 'Copied request' : 'Copy request example'" @click="copy(requestCode, 'request')">
            <span v-if="copied === 'request'">✓</span>
            <svg v-else class="size-[18px]" viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="7" y="3" width="9" height="11" rx="2" stroke="currentColor"/><path d="M12 14v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h3" stroke="currentColor"/></svg>
          </button>
        </div>
        <pre tabindex="0" class="m-0 min-h-0 overflow-auto overscroll-contain [scrollbar-width:thin] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-neutral-500 px-5 py-3.5 text-xs leading-[1.7] text-[#435a78] [tab-size:2]" v-if="requestCode"><code>{{ requestCode }}</code></pre>
        <p v-else class="p-4 text-[13px] text-neutral-500">{{ requestView === 'schema' ? 'No schema provided.' : 'No example provided.' }}</p>
      </section>
      <section class="flex max-h-[60dvh] min-h-0 min-w-0 flex-auto flex-col overflow-hidden rounded-xl border border-[#eeeeef] text-xs min-[1200px]:max-h-none" aria-label="Response example">
        <div class="flex min-h-11 shrink-0 items-center gap-2 border-b border-[#eeeeef] px-3 py-2 md:px-4">
          <span>Output</span><span class="shrink-0 text-neutral-600">JSON</span>
          <select class="ml-auto min-w-0 max-w-[90px] cursor-pointer bg-transparent text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-500" v-if="responseStatus" v-model="responseStatus" aria-label="Response status"><option v-for="(_, status) in operation.responses" :key="status" :value="status">{{ status }}</option></select>
          <select :class="{'ml-auto': !responseStatus}" class="min-w-0 max-w-[90px] cursor-pointer bg-transparent text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-500" v-model="responseView" aria-label="Response example or schema"><option value="example">Example</option><option value="schema">Schema</option></select>
          <button class="grid size-6 shrink-0 place-items-center rounded text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 disabled:cursor-default disabled:opacity-[.35] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-500" :disabled="!responseCode" :aria-label="copied === 'response' ? 'Copied response' : 'Copy response example'" @click="copy(responseCode, 'response')">
            <span v-if="copied === 'response'">✓</span>
            <svg v-else class="size-[18px]" viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="7" y="3" width="9" height="11" rx="2" stroke="currentColor"/><path d="M12 14v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h3" stroke="currentColor"/></svg>
          </button>
        </div>
        <pre tabindex="0" class="m-0 min-h-0 flex-auto overflow-auto overscroll-contain [scrollbar-width:thin] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-neutral-500 px-5 py-3.5 text-xs leading-[1.7] text-[#435a78] [tab-size:2]" v-if="responseCode"><code>{{ responseCode }}</code></pre>
        <p v-else class="p-4 text-[13px] text-neutral-500">{{ responseView === 'schema' ? 'No schema provided.' : 'No example provided.' }}</p>
      </section>
      <p class="sr-only" role="status">{{ copied ? 'Example copied.' : copyError }}</p>
    </div>
  </aside>
</template>
