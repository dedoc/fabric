<script setup lang="ts">
import {onErrorCaptured, onMounted, onUnmounted, ref} from 'vue'
import Pages from './Layouts/Pages.vue'
import SpecError from './SpecError.vue'
import {fetchSpecification, parseSpecification, SpecificationError} from './OpenApi/specification'
import type {Document} from './OpenApi/types'
import type {FabricOptions} from '../types'

const props = defineProps<FabricOptions>()

const specification = ref<Document>()
const documentUrl = ref('')
const state = ref<'loading' | 'ready' | 'error'>('loading')
const message = ref('')
let controller: AbortController | undefined

async function load() {
  controller = new AbortController()
  state.value = 'loading'
  specification.value = undefined
  message.value = ''
  try {
    const source = props.openApiDocument
    const result = source !== undefined
      ? {
          document: parseSpecification(typeof source === 'function' ? await source() : source),
          documentUrl: new URL(props.openApiDocumentUrl ?? window.location.href, window.location.href).href,
        }
      : await fetchSpecification(props.openApiDocumentUrl!, controller.signal)
    specification.value = result.document
    documentUrl.value = result.documentUrl
    state.value = 'ready'
  } catch (error) {
    message.value = error instanceof SpecificationError ? error.message : 'The specification could not be displayed. Check the document and try again.'
    state.value = 'error'
  }
}

onErrorCaptured((error) => {
  console.error('API reference rendering failed', error)
  message.value = 'Something in this specification could not be displayed. Check the document and try again.'
  state.value = 'error'
  return false
})
onMounted(load)
onUnmounted(() => controller?.abort())
</script>

<template>
  <SpecError v-if="state === 'error'" :message="message" @retry="load" />
  <main v-else-if="state === 'loading'" class="grid min-h-dvh place-items-center px-6" role="status">
    <p class="text-sm text-gray-500 dark:text-gray-400">Loading API reference…</p>
  </main>
  <Pages v-else-if="specification" :document="specification" :document-url="documentUrl" />
</template>
