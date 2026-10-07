<script setup lang="ts">
import {InjectionKey, onMounted, provide, ref} from 'vue'
import Pages from "./Layouts/Pages.vue";
import {documentKey} from "../utils/symbols.ts";
import {parse} from 'yaml'

withDefaults(defineProps<{ msg: string, showSchemas?: boolean }>(), {showSchemas: true})

const document = ref(null)
const documentUrl = ref('')

onMounted(async () => {
  async function getDocument () {
    // Converterer: fetch through the Vite development proxy to avoid browser CORS restrictions.
    // const f = await fetch('/converterer/openapi.json')
    // Petstore: small baseline with multiple content types and response headers.
    // const f = await fetch('https://petstore3.swagger.io/api/v3/openapi.json')
    // GitHub: large fixture for navigation, search, and schema references.
    // const f = await fetch('https://raw.githubusercontent.com/github/rest-api-description/main/descriptions/api.github.com/api.github.com.json')
    // Stripe: large fixture for nested schemas and rendering performance.
    // const f = await fetch('https://raw.githubusercontent.com/stripe/openapi/master/openapi/spec3.json')
    // const f = await fetch('https://raw.githubusercontent.com/box/box-openapi/main/openapi.json')
    // Spotify: official YAML specification, proxied to avoid browser CORS restrictions.
    const f = await fetch('/spotify/open-api-schema.yaml')
    // const f = await fetch('http://demo-scramble-pro.test/docs/api.json')
    // const f = await fetch('/docs/api.json')
    // const f = await fetch('http://l12app.test/docs/api.json')
    // const f = await fetch('http://reproduction.test/docs/api.json')
    // const f = await fetch('http://l12.test/docs/api.json')
    const sourceUrls: Record<string, string> = {
      '/converterer/openapi.json': 'https://api.converterer.com/openapi.json',
      '/spotify/open-api-schema.yaml': 'https://developer.spotify.com/reference/web-api/open-api-schema.yaml',
    }
    documentUrl.value = sourceUrls[new URL(f.url).pathname] ?? f.url
    return parse(await f.text())
  }

  document.value = await getDocument()
})

provide(documentKey, document)

//https://github.com/xiaoluoboding/vue-command-palette
// fuse for search
</script>

<template>
  <Pages
      v-if="document"
      :document="document"
      :document-url="documentUrl"
      :components="document.components ?? {}"
      :paths="document.paths ?? {}"
      :showSchemas="showSchemas"
  />
</template>
