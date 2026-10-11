<script setup lang="ts">
import {computed, ref} from 'vue'
import type {Components, Schema} from './types'
import {createSchemaExample, resolveExampleSchema} from './schemaExamples'
import {useReferences} from './useReferences'
import ReferenceDiagnostics from './ReferenceDiagnostics.vue'
import type {ReferenceIssue} from './references'
import {useCompositionSelections} from './useCompositionSelections'
import {selectExampleSchema} from './compositionExamples'
import {createSchemaTypescript} from './schemaTypescript'
import {useStoredChoice} from './useStoredChoice'
import HighlightedCode from './HighlightedCode.vue'

const props = defineProps<{schema: Schema, components: Components, name?: string}>()
const references = useReferences(() => props.components)
const {selections} = useCompositionSelections()
const schemaResolution = computed(() => {
  const issues: ReferenceIssue[] = []
  const selected = selectExampleSchema(props.schema, references.document.value, selections.value).schema
  const value = resolveExampleSchema(selected, props.components, references.document.value, issue => issues.push(issue))
  return {value, issues}
})
const tabs = [{id: 'example', label: 'Example'}, {id: 'schema', label: 'JSON schema'}, {id: 'typescript', label: 'TypeScript'}] as const
const selectedTab = useStoredChoice('fabric:schema-tab', tabs.map(tab => tab.id), 'example')
const panelId = 'schema-example'
const copied = ref(false)
const copyError = ref('')
const sample = computed(() => {
  try {
    if (selectedTab.value === 'typescript') {
      const result = createSchemaTypescript(props.schema, references.document.value, props.name)
      return {code: result.code, issues: result.issues, error: result.issues.length ? 'TypeScript output is unavailable until schema references are resolved.' : ''}
    }
    const value = selectedTab.value === 'schema' ? props.schema : schemaResolution.value.issues.length ? undefined : createSchemaExample(schemaResolution.value.value)
    return {code: JSON.stringify(value, null, 2) ?? '', issues: [], error: ''}
  } catch (error) { return {code: '', issues: [], error: error instanceof Error ? error.message : String(error)} }
})
const code = computed(() => sample.value.code)

function selectTab(index: number, event: KeyboardEvent) {
  const key = event.key
  const next = key === 'ArrowRight' ? (index + 1) % tabs.length : key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : key === 'Home' ? 0 : key === 'End' ? tabs.length - 1 : undefined
  if (next === undefined) return
  event.preventDefault()
  selectedTab.value = tabs[next].id
  const buttons = (event.currentTarget as HTMLElement).parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
  buttons?.[next].focus()
}
async function copy() {
  try {
    await navigator.clipboard.writeText(code.value)
    copied.value = true
    copyError.value = ''
    window.setTimeout(() => { copied.value = false }, 2000)
  } catch { copyError.value = 'Unable to copy. Select and copy the code manually.' }
}
</script>

<template>
  <aside class="col-start-1 min-w-0 self-stretch min-[1200px]:col-start-2 min-[1200px]:row-start-2 min-[1200px]:h-0 min-[1200px]:min-h-full" aria-label="Schema examples">
    <ReferenceDiagnostics :issues="selectedTab === 'typescript' ? sample.issues : schemaResolution.issues" />
    <section class="flex max-h-[32rem] min-h-0 flex-col overflow-hidden rounded-xl border border-gray-950/10 text-sm sm:text-xs min-[1200px]:sticky min-[1200px]:top-8 min-[1200px]:max-h-[min(100%,calc(100dvh-64px))]">
      <div class="flex min-h-12 shrink-0 items-center gap-2 border-b border-gray-950/10 px-4 py-2">
        <div class="flex min-w-0 flex-auto items-center gap-1 overflow-x-auto [scrollbar-width:none]" role="tablist" aria-label="Schema example format">
          <button v-for="(tab, index) of tabs" :id="`${panelId}-${tab.id}`" :key="tab.id" type="button" role="tab" :aria-selected="selectedTab === tab.id" :aria-controls="`${panelId}-panel`" :tabindex="selectedTab === tab.id ? 0 : -1" class="min-h-8 shrink-0 whitespace-nowrap rounded-full px-2.5 py-1.5" :class="selectedTab === tab.id ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-900'" @click="selectedTab = tab.id" @keydown="selectTab(index, $event)">{{ tab.label }}</button>
        </div>
        <button type="button" class="copy-button" :disabled="!code" :aria-label="copied ? 'Copied schema example' : 'Copy schema example'" @click="copy">
          <span v-if="copied">✓</span>
          <svg v-else class="size-[18px]" viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="7" y="3" width="9" height="11" rx="2" stroke="currentColor"/><path d="M12 14v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h3" stroke="currentColor"/></svg>
        </button>
      </div>
      <pre :id="`${panelId}-panel`" role="tabpanel" :aria-labelledby="`${panelId}-${selectedTab}`" tabindex="0" class="m-0 min-h-0 flex-auto overflow-auto overscroll-contain p-4 font-jetbrains-mono text-sm leading-6 text-[#435a78] sm:text-xs sm:leading-5 [scrollbar-width:thin] [tab-size:2] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-500"><HighlightedCode :code="code" :language="selectedTab === 'typescript' ? 'typescript' : 'json'" /></pre>
      <p v-if="sample.error" role="note" class="px-4 pb-4 text-amber-700">{{ sample.error }}</p>
      <p class="sr-only" role="status">{{ copied ? 'Example copied.' : copyError }}</p>
    </section>
  </aside>
</template>
