<script setup lang="ts">
import type {Operation} from '../types'
import {computed, inject, ref} from 'vue'
import {documentKey} from '../../../utils/symbols'
import {httpAuthKind, operationSecurity, securitySchemeLabel} from '../security'
import {authorizationForOption, httpAuthForOperation, useAuthCredentials} from '../useAuthCredentials'
import SecuritySchemeDetails from './SecuritySchemeDetails.vue'

const props = defineProps<{operation: Operation}>()
const document = inject(documentKey)
if (!document) throw new Error('document must be provided')
const credentials = useAuthCredentials()
const hasCredentials = computed(() => !!authorizationForOption(httpAuthForOperation(props.operation, document.value, credentials?.value ?? {})))
const dialog = ref<HTMLDialogElement>()
let opener: HTMLElement | undefined
const draft = ref<Record<string, {username: string, password: string, token: string}>>({})
const alternatives = computed(() => operationSecurity(props.operation, document.value))
const optional = computed(() => alternatives.value.some(group => !group.length))
const authenticated = computed(() => alternatives.value.filter(group => group.length))
const editableSchemes = computed(() => {
  const schemes = new Map<string, {name: string, kind: 'basic' | 'bearer'}>()
  for (const group of authenticated.value) for (const {name, scheme} of group) {
    const kind = httpAuthKind(scheme)
    if (kind) schemes.set(name, {name, kind})
  }
  return [...schemes.values()]
})
const label = computed(() => authenticated.value.map(group => group.map(({scheme}) =>
  httpAuthKind(scheme) === 'basic' ? 'Basic' : httpAuthKind(scheme) === 'bearer' ? 'Bearer' : securitySchemeLabel(scheme)
).join(' + ')).join(' or ') + (optional.value ? ' (optional)' : ''))

function open(trigger?: HTMLElement) {
  opener = trigger
  draft.value = Object.fromEntries(editableSchemes.value.map(({name}) => [name, {username: '', password: '', token: '', ...credentials?.value[name]}]))
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
function save() {
  if (credentials) {
    for (const {name, kind} of editableSchemes.value) {
      const value = draft.value[name]
      if (kind === 'basic' && value.username) credentials.value[name] = {username: value.username, password: value.password}
      else if (kind === 'bearer' && value.token.trim()) credentials.value[name] = {token: value.token.trim()}
      else delete credentials.value[name]
    }
  }
  dialog.value?.close()
}
function clear() {
  for (const {name} of editableSchemes.value) {
    if (credentials) delete credentials.value[name]
    draft.value[name] = {username: '', password: '', token: ''}
  }
  dialog.value?.close()
}
defineExpose({open})
</script>

<template>
  <div v-if="authenticated.length" class="text-base text-gray-500 sm:text-sm">
    <button type="button" class="relative inline-flex items-center gap-1.5 py-1 underline decoration-gray-950/20 underline-offset-4 hover:text-gray-700 hover:decoration-gray-950/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500 data-[auth-restored-focus]:!outline-none" aria-haspopup="dialog" @click="open($event.currentTarget as HTMLElement)">
      <svg viewBox="0 0 16 16" fill="currentColor" class="size-4 shrink-0" :class="hasCredentials ? 'text-green-600' : 'text-gray-400'" aria-hidden="true">
        <path fill-rule="evenodd" d="M8 1a3.5 3.5 0 0 0-3.5 3.5V7A1.5 1.5 0 0 0 3 8.5v5A1.5 1.5 0 0 0 4.5 15h7a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 11.5 7V4.5A3.5 3.5 0 0 0 8 1Zm2 6V4.5a2 2 0 1 0-4 0V7h4Z" clip-rule="evenodd" />
      </svg>
      <span>Auth: {{ label }}</span>
      <span class="absolute -inset-y-3 inset-x-0 sm:hidden" aria-hidden="true"></span>
    </button>
    <dialog ref="dialog" aria-label="Authentication" @close="onClose" class="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-gray-950/10 bg-white p-6 text-gray-700 backdrop:bg-gray-950/30" @click="onBackdropClick">
      <div class="flex items-center justify-between gap-4 pb-5">
        <h2 class="text-balance text-lg font-semibold text-gray-900">Authentication</h2>
        <button type="button" class="rounded-lg px-3 py-2 text-base text-gray-500 hover:bg-gray-950/5 hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gray-500 sm:text-sm" @click="dialog?.close()">Close</button>
      </div>
      <div class="space-y-4">
        <p v-if="optional" class="text-base sm:text-sm">Authentication is optional. You can use this endpoint without credentials, or authenticate using {{ authenticated.length > 1 ? 'one of the following options' : 'the method below' }}.</p>
        <p v-else-if="authenticated.length > 1" class="text-base sm:text-sm">Use one of the following authentication options.</p>
        <div v-for="(group, index) in authenticated" :key="index" class="space-y-3">
          <p v-if="authenticated.length > 1" class="text-base font-medium text-gray-500 sm:text-sm">{{ index ? 'Or — ' : '' }}Option {{ index + 1 }}</p>
          <p v-if="group.length > 1" class="text-base sm:text-sm">All of these methods are required together.</p>
          <div class="space-y-4">
            <SecuritySchemeDetails v-for="entry in group" :key="entry.name" v-bind="entry" />
          </div>
        </div>
      </div>
      <form v-if="editableSchemes.length && Object.keys(draft).length" class="mt-5 space-y-5 border-t border-gray-950/10 pt-5" autocomplete="off" @submit.prevent="save">
        <fieldset v-for="{name, kind} in editableSchemes" :key="name" class="max-w-xs space-y-3">
          <legend v-if="editableSchemes.length > 1" class="pb-3 text-base font-medium sm:text-sm">{{ name }}</legend>
          <label v-if="kind === 'basic'" class="grid gap-1.5 text-base sm:text-sm">
            Username
            <input v-model="draft[name].username" :name="`${name}-username`" type="text" pattern="[^:]*" title="Basic authentication usernames cannot contain a colon." autocomplete="off" autocapitalize="none" spellcheck="false" class="min-w-0 rounded-xl border border-gray-950/15 px-3 py-2 text-base text-gray-900 focus:outline focus:outline-2 focus:-outline-offset-1 focus:outline-gray-500 sm:text-sm">
          </label>
          <label v-if="kind === 'basic'" class="grid gap-1.5 text-base sm:text-sm">
            Password
            <input v-model="draft[name].password" :name="`${name}-password`" type="password" autocomplete="off" class="min-w-0 rounded-xl border border-gray-950/15 px-3 py-2 text-base text-gray-900 focus:outline focus:outline-2 focus:-outline-offset-1 focus:outline-gray-500 sm:text-sm">
          </label>
          <template v-if="kind === 'bearer'">
            <label class="grid gap-1.5 text-base sm:text-sm">
              Bearer token
              <input v-model="draft[name].token" :name="`${name}-token`" type="password" autocomplete="off" spellcheck="false" class="min-w-0 rounded-xl border border-gray-950/15 px-3 py-2 text-base text-gray-900 focus:outline focus:outline-2 focus:-outline-offset-1 focus:outline-gray-500 sm:text-sm">
            </label>
            <p class="text-base text-gray-500 sm:text-sm">Enter the token only, without the Bearer prefix.</p>
          </template>
        </fieldset>
        <p class="text-pretty text-base text-gray-500 sm:text-sm">Credentials are kept in memory for this API and included in request examples.</p>
        <div class="flex flex-wrap items-center gap-3">
          <button type="submit" class="rounded-xl bg-gray-900 px-4 py-2.5 text-base font-medium text-white hover:bg-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500 sm:text-sm">Apply credentials</button>
          <button type="button" class="rounded-xl px-4 py-2.5 text-base text-gray-600 hover:bg-gray-950/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gray-500 sm:text-sm" @click="clear">Clear credentials</button>
        </div>
      </form>
    </dialog>
  </div>
</template>
