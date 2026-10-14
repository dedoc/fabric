<script setup lang="ts">
import type {Operation} from '../types'
import {computed, inject, ref} from 'vue'
import {documentKey} from '../../../utils/symbols'
import {operationSecurity, resolveSecurityScheme} from '../security'
import ReferenceDiagnostics from '../ReferenceDiagnostics.vue'
import type {ReferenceIssue} from '../references'
import SecuritySchemeDetails from './SecuritySchemeDetails.vue'

const props = defineProps<{operation: Operation}>()
const document = inject(documentKey)
if (!document) throw new Error('document must be provided')
const dialog = ref<HTMLDialogElement>()
let opener: HTMLElement | undefined
const alternatives = computed(() => operationSecurity(props.operation, document.value))
const optional = computed(() => alternatives.value.some(group => !group.length))
const authenticated = computed(() => alternatives.value.filter(group => group.length))
const issues = computed(() => {
  const result: ReferenceIssue[] = []
  for (const name of new Set(authenticated.value.flatMap(group => group.map(entry => entry.name)))) {
    resolveSecurityScheme(name, document.value.components ?? {}, document.value, issue => result.push(issue))
  }
  return result
})

function open(trigger?: HTMLElement) {
  opener = trigger
  dialog.value?.showModal()
}
function onClose() {
  if (!opener) return
  const trigger = opener
  trigger.setAttribute('data-auth-restored-focus', '')
  // Keep the browser's focus restoration, but suppress its synthetic focus ring.
  // Leaving the trigger restores normal focus-visible styling for keyboard use.
  trigger.addEventListener('blur', () => trigger.removeAttribute('data-auth-restored-focus'), {once: true})
}
function onBackdropClick(event: MouseEvent) {
  const element = dialog.value
  if (!element || event.target !== element) return
  const bounds = element.getBoundingClientRect()
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) {
    element.close()
  }
}
</script>

<template>
  <div v-if="authenticated.length" class="text-base text-gray-500 dark:text-gray-400 sm:text-sm">
    <ReferenceDiagnostics :issues="issues" />
    <button type="button" class="relative inline-flex rounded-[--radius] items-center gap-1.5 py-1 underline decoration-gray-950/20 dark:decoration-gray-500 underline-offset-4 hover:text-gray-700 hover:dark:text-gray-300 hover:decoration-gray-950/40 dark:hover:decoration-gray-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500 data-[auth-restored-focus]:!outline-none" aria-haspopup="dialog" @click="open($event.currentTarget as HTMLElement)">
      <svg viewBox="0 0 16 16" fill="currentColor" class="size-4 shrink-0 text-gray-400 dark:text-gray-500" aria-hidden="true">
        <path fill-rule="evenodd" d="M8 1a3.5 3.5 0 0 0-3.5 3.5V7A1.5 1.5 0 0 0 3 8.5v5A1.5 1.5 0 0 0 4.5 15h7a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 11.5 7V4.5A3.5 3.5 0 0 0 8 1Zm2 6V4.5a2 2 0 1 0-4 0V7h4Z" clip-rule="evenodd" />
      </svg>
      <span>{{ optional ? 'Auth optional' : 'Auth required' }}</span>
      <span class="absolute -inset-y-3 inset-x-0 sm:hidden" aria-hidden="true"></span>
    </button>
    <dialog ref="dialog" aria-label="Authentication" @close="onClose" class="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-gray-950/10 dark:border-gray-700 bg-white dark:bg-gray-900 dark:shadow-none p-6 text-gray-700 dark:text-gray-300 backdrop:bg-gray-950/30 dark:backdrop:bg-black/60" @click="onBackdropClick">
      <div class="flex items-center justify-between gap-4 pb-5">
        <h2 class="text-balance text-lg font-semibold text-gray-900 dark:text-gray-100">Authentication</h2>
        <button type="button" class="rounded-[--radius] px-3 py-2 text-base text-gray-500 dark:text-gray-400 hover:bg-gray-950/5 hover:dark:bg-white/5 hover:text-gray-900 hover:dark:text-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gray-500 sm:text-sm" @click="dialog?.close()">Close</button>
      </div>
      <div class="space-y-4">
        <p v-if="optional" class="text-base sm:text-sm">Authentication is optional. You can use this endpoint without credentials, or authenticate using {{ authenticated.length > 1 ? 'one of the following options' : 'the method below' }}.</p>
        <p v-else-if="authenticated.length > 1" class="text-base sm:text-sm">Use one of the following authentication options.</p>
        <div v-for="(group, index) in authenticated" :key="index" class="space-y-3">
          <p v-if="authenticated.length > 1" class="text-base font-medium text-gray-500 dark:text-gray-400 sm:text-sm">{{ index ? 'Or — ' : '' }}Option {{ index + 1 }}</p>
          <p v-if="group.length > 1" class="text-base sm:text-sm">All of these methods are required together.</p>
          <div class="space-y-4">
            <SecuritySchemeDetails v-for="entry in group" :key="entry.name" v-bind="entry" />
          </div>
        </div>
      </div>
    </dialog>
  </div>
</template>
