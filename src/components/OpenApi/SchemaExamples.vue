<script setup lang="ts">
import {computed, ref} from 'vue'
import type {Components, Schema} from './types'
import {createSchemaExample, resolveExampleSchema} from './schemaExamples'

const props = defineProps<{schema: Schema, components: Components}>()
const tabs = [{id: 'example', label: 'Example'}, {id: 'schema', label: 'JSON schema'}, {id: 'typescript', label: 'Typescript'}] as const
const selectedTab = ref<(typeof tabs)[number]['id']>('example')
const panelId = 'schema-example'
const copied = ref(false)
const copyError = ref('')
const code = computed(() => {
  if (selectedTab.value === 'typescript') return 'TODO'
  const value = selectedTab.value === 'schema' ? props.schema : createSchemaExample(resolveExampleSchema(props.schema, props.components))
  return JSON.stringify(value, null, 2) ?? ''
})

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
  <aside class="col-start-1 min-w-0 self-stretch min-[1200px]:col-start-2 min-[1200px]:row-start-2" aria-label="Schema examples">
    <section class="flex max-h-[calc(100dvh-48px)] min-h-0 flex-col overflow-hidden rounded-xl border border-[#eeeeef] text-xs min-[1200px]:sticky min-[1200px]:top-6">
      <div class="flex min-h-11 shrink-0 items-center gap-2 border-b border-[#eeeeef] px-3 py-2 md:px-4">
        <div class="flex min-w-0 flex-auto items-center gap-1 overflow-x-auto [scrollbar-width:none]" role="tablist" aria-label="Schema example format">
          <button v-for="(tab, index) of tabs" :id="`${panelId}-${tab.id}`" :key="tab.id" type="button" role="tab" :aria-selected="selectedTab === tab.id" :aria-controls="`${panelId}-panel`" :tabindex="selectedTab === tab.id ? 0 : -1" class="shrink-0 whitespace-nowrap rounded-full px-2.5 py-1.5 text-xs" :class="selectedTab === tab.id ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-500 hover:text-neutral-900'" @click="selectedTab = tab.id" @keydown="selectTab(index, $event)">{{ tab.label }}</button>
        </div>
        <button type="button" class="grid size-6 shrink-0 place-items-center rounded text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900" :aria-label="copied ? 'Copied schema example' : 'Copy schema example'" @click="copy">
          <span v-if="copied">✓</span>
          <svg v-else class="size-[18px]" viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="7" y="3" width="9" height="11" rx="2" stroke="currentColor"/><path d="M12 14v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h3" stroke="currentColor"/></svg>
        </button>
      </div>
      <pre :id="`${panelId}-panel`" role="tabpanel" :aria-labelledby="`${panelId}-${selectedTab}`" tabindex="0" class="m-0 min-h-0 flex-auto overflow-auto overscroll-contain px-5 py-3.5 text-xs leading-[1.7] text-[#435a78] [scrollbar-width:thin] [tab-size:2] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-neutral-500"><code>{{ code }}</code></pre>
      <p class="sr-only" role="status">{{ copied ? 'Example copied.' : copyError }}</p>
    </section>
  </aside>
</template>
