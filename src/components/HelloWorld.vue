<script setup lang="ts">
import {onMounted, onUnmounted, ref} from 'vue'
import Fabric from '../index'
import {fetchSpecification} from './OpenApi/specification'
import auth from '../playground/guides/auth.md?raw'
import pagination from '../playground/guides/pagination.md?raw'
import errors from '../playground/guides/errors.md?raw'

const props = defineProps<{specUrl?: string}>()

// Uncomment one URL at a time to switch the test specification.
// const specUrl = '/spotify/open-api-schema.yaml'
// const specUrl = '/converterer/openapi.json'
// const specUrl = '/specs/redocly-petstore.yaml'
const specUrl = '/specs/fabric-reference.yaml'
// const specUrl = 'https://raw.githubusercontent.com/Redocly/redoc/v2.0.0-rc.1/demo/openapi.yaml'
// const specUrl = 'https://raw.githubusercontent.com/Redocly/redoc/main/demo/openapi.yaml'
// const specUrl = 'https://api.savvycal.com/v1/spec'
// const specUrl = 'https://registry.scalar.com/@scalar/apis/galaxy?format=json'
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

// Preserve the upstream base URL for mirrored specs and development proxies.
const proxySources: Record<string, string> = {
  '/specs/redocly-petstore.yaml': 'https://raw.githubusercontent.com/Redocly/redoc/v2.0.0-rc.1/demo/openapi.yaml',
  '/spotify/open-api-schema.yaml': 'https://developer.spotify.com/reference/web-api/open-api-schema.yaml',
  '/converterer/openapi.json': 'https://api.converterer.com/openapi.json',
}

const container = ref<HTMLElement>()
const controller = new AbortController()
let viewer: ReturnType<typeof Fabric.init> | undefined

function mount() {
  if (!container.value) return
  const url = props.specUrl ?? specUrl
  const originalUrl = proxySources[url]
  viewer = Fabric.init(container.value, {
    ...(originalUrl ? {
      openApiDocument: async () => JSON.stringify((await fetchSpecification(url, controller.signal)).document),
      openApiDocumentUrl: originalUrl,
    } : {openApiDocumentUrl: url}),
    guides: {auth, pagination, errors},
  })
}

onMounted(mount)
onUnmounted(() => {
  controller.abort()
  viewer?.destroy()
})
</script>

<template>
  <div ref="container" />
</template>
