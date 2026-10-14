<script setup lang="ts">
import {computed, nextTick, onMounted, onUnmounted, ref, watch} from 'vue'
import {Command, useCommandState} from 'vue-command-palette'
import {createSearchIndex, searchEntries, type SearchEntry} from '../search'
import MethodChip from '../../OpenApi/Partials/MethodChip.vue'

const props = defineProps<{entries: SearchEntry[]}>()
const emit = defineEmits<{navigate: [id: string]}>()
const dialog = ref<HTMLDialogElement>()
const trigger = ref<HTMLButtonElement>()
const input = ref<HTMLInputElement>()
const query = ref('')
const open = ref(false)
const activeId = ref<string>()
const shortcut = ref('Ctrl+K')
const index = computed(() => createSearchIndex(props.entries))
const {selectedNode, resetStore} = useCommandState()
const results = computed(() => query.value.trim()
  ? searchEntries(index.value, query.value)
  : props.entries.slice(0, 50))

async function show() {
  resetStore()
  query.value = ''
  open.value = true
  await nextTick()
  dialog.value?.showModal()
  input.value?.focus()
}
watch([results, open], async () => {
  await nextTick()
  selectedNode.value = dialog.value?.querySelector('[command-item]')?.getAttribute('command-item-key') ?? ''
})
watch(selectedNode, async () => {
  if (!open.value) return
  await nextTick()
  activeId.value = dialog.value?.querySelector('[aria-selected="true"]')?.id
})
function close() {
  dialog.value?.close()
  open.value = false
  activeId.value = undefined
  if (trigger.value && document.activeElement === trigger.value) {
    const element = trigger.value
    element.setAttribute('data-search-restored-focus', '')
    element.addEventListener('blur', () => element.removeAttribute('data-search-restored-focus'), {once: true})
  }
}
function select(id: string) {
  close()
  emit('navigate', id)
}
function highlightResult(event: PointerEvent) {
  if (event.pointerType === 'touch') return
  selectedNode.value = (event.currentTarget as HTMLElement).getAttribute('command-item-key') ?? ''
}
function onShortcut(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k' && !event.isComposing) {
    event.preventDefault()
    event.stopPropagation()
    if (open.value) close()
    else void show()
  }
}
function onBackdrop(event: MouseEvent) {
  if (event.target !== dialog.value) return
  const bounds = dialog.value!.getBoundingClientRect()
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close()
}
onMounted(() => {
  shortcut.value = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘K' : 'Ctrl+K'
  window.addEventListener('keydown', onShortcut, true)
})
onUnmounted(() => {
  window.removeEventListener('keydown', onShortcut, true)
})
</script>

<template>
  <button ref="trigger" type="button" class="mb-6 flex w-full cursor-text items-center gap-2 rounded-[--radius] border border-[color:var(--schema-border-color)] px-2.5 py-2 text-left text-sm text-gray-500 dark:text-gray-400 data-[search-restored-focus]:!outline-none" aria-haspopup="dialog" @click="show">
    <svg class="size-4 shrink-0" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor"/><path d="m13 13 4 4" stroke="currentColor"/></svg>
    <span class="min-w-0 flex-1 truncate">Search reference…</span>
    <kbd class="-my-0.5 -mr-1 shrink-0 rounded bg-gray-100 px-2 py-1 font-sans text-xs leading-4 dark:bg-gray-800">{{ shortcut }}</kbd>
  </button>
  <Teleport to="body" :disabled="!open">
  <dialog ref="dialog" aria-label="Search reference" class="fixed inset-x-0 bottom-auto top-[min(15dvh,6rem)] mx-auto my-0 max-h-[calc(100dvh-min(15dvh,6rem)-1rem)] w-[calc(100%-2rem)] max-w-xl overflow-hidden rounded-2xl border border-gray-200 bg-white p-0 text-gray-900 shadow-xl backdrop:bg-gray-950/50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:shadow-none dark:backdrop:bg-black/60" @cancel.prevent="close" @close="open = false" @click="onBackdrop">
    <Command v-if="open" theme="reference-search">
      <div class="flex items-center gap-3 border-b border-gray-200 px-4 dark:border-gray-700">
        <input ref="input" v-model="query" type="text" role="combobox" aria-label="Search reference" aria-autocomplete="list" aria-expanded="true" aria-controls="reference-search-results" :aria-activedescendant="activeId" autocomplete="off" spellcheck="false" placeholder="Search operations, guides, schemas…" class="h-14 min-w-0 flex-1 bg-transparent text-base outline-none sm:text-sm" @keydown.enter.prevent>
        <button type="button" aria-label="Close search" class="min-h-11 rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-100" @click="close" @keydown.stop>Esc</button>
      </div>
      <Command.List id="reference-search-results" aria-label="Search results" class="max-h-[min(60dvh,420px)] overflow-y-auto overscroll-contain p-2">
        <Command.Item v-for="(item, position) of results" :id="`reference-search-result-${position}`" :key="item.id" :data-value="item.id" class="flex cursor-pointer items-center gap-3 rounded-[--radius] px-3 py-3 text-sm aria-selected:bg-gray-100 dark:aria-selected:bg-white/5" @pointermove="highlightResult" @select="select(item.id)">
          <div class="min-w-0 flex-1">
            <div class="truncate font-medium dark:text-gray-100">{{ item.title }}</div>
            <div class="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">{{ item.kind }} · {{ item.detail }}</div>
          </div>
          <MethodChip v-if="item.method" :method="item.method" class="shrink-0 text-xs" />
        </Command.Item>
        <p v-if="!results.length" role="status" class="px-3 py-8 text-center text-sm text-gray-500 dark:text-gray-400">No results for “{{ query }}”.</p>
      </Command.List>
      <div class="flex gap-4 border-t border-gray-200 px-4 py-3 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
        <span>↑ ↓ to navigate</span><span>↵ to open</span><span class="ml-auto">{{ results.length }} results</span>
      </div>
    </Command>
  </dialog>
  </Teleport>
</template>
