<script setup lang="ts">
import {onErrorCaptured, onMounted, onUnmounted, provide, ref, watch} from 'vue'
import Pages from './Layouts/Pages.vue'
import SpecError from './SpecError.vue'
import {documentKey} from '../utils/symbols'
import type {Document} from './OpenApi/types'
import {fetchSpecification, SpecificationError} from './OpenApi/specification'
import type {Specification} from './OpenApi/specification'

const props = withDefaults(defineProps<{showSchemas?: boolean, specUrl?: string}>(), {showSchemas: true})

// Uncomment one URL at a time to switch the test specification.
// const specUrl = '/spotify/open-api-schema.yaml'
// const specUrl = '/converterer/openapi.json'
const specUrl = 'https://galaxy.scalar.com/openapi.json'
// const specUrl = 'https://raw.githubusercontent.com/SpaceTradersAPI/api-docs/main/reference/SpaceTraders.json'
// const specUrl = 'https://petstore3.swagger.io/api/v3/openapi.json'
// const specUrl = 'https://raw.githubusercontent.com/github/rest-api-description/main/descriptions/api.github.com/api.github.com.json'
// const specUrl = 'https://raw.githubusercontent.com/stripe/openapi/master/openapi/spec3.json'
// const specUrl = 'https://raw.githubusercontent.com/box/box-openapi/main/openapi.json'
// const specUrl = 'http://demo-scramble-pro.test/docs/api.json'
// const specUrl = '/docs/api.json'
// const specUrl = 'http://l12app.test/docs/api.json'
// const specUrl = 'http://reproduction.test/docs/api.json'
// const specUrl = 'http://l12.test/docs/api.json'

// Preserve the upstream base URL when loading through a development proxy.
const proxySources: Record<string, string> = {
  '/spotify/open-api-schema.yaml': 'https://developer.spotify.com/reference/web-api/open-api-schema.yaml',
  '/converterer/openapi.json': 'https://api.converterer.com/openapi.json',
}
const document = ref<Document>({})
const specification = ref<Specification>()
const documentUrl = ref('')
const state = ref<'loading' | 'ready' | 'error'>('loading')
const message = ref('')
let controller: AbortController | undefined
let revision = 0

provide(documentKey, document)

async function load() {
  const current = ++revision
  controller?.abort()
  controller = new AbortController()
  state.value = 'loading'
  specification.value = undefined
  message.value = ''
  try {
    const url = props.specUrl ?? specUrl
    const result = await fetchSpecification(url, controller.signal)
    if (current !== revision) return
    document.value = result.document
    specification.value = result.document
    documentUrl.value = proxySources[url] ?? result.documentUrl
    state.value = 'ready'
  } catch (error) {
    if (current !== revision) return
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
watch(() => props.specUrl, load)
onUnmounted(() => { revision++; controller?.abort() })
</script>

<template>
  <SpecError v-if="state === 'error'" :message="message" @retry="load" />
  <main v-else-if="state === 'loading'" class="grid min-h-dvh place-items-center px-6" role="status">
    <p class="text-sm text-gray-500">Loading API reference…</p>
  </main>
  <Pages v-else-if="specification" :key="revision" :document="specification" :document-url="documentUrl" :components="specification.components ?? {}" :paths="specification.paths" :show-schemas="showSchemas" />
</template>
