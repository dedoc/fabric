<script setup lang="ts">
import {InjectionKey, onMounted, provide, ref} from 'vue'
import Pages from "./Layouts/Pages.vue";
import {documentKey} from "../utils/symbols.ts";

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
    const f = await fetch('https://raw.githubusercontent.com/box/box-openapi/main/openapi.json')
    // const f = await fetch('http://demo-scramble-pro.test/docs/api.json')
    // const f = await fetch('/docs/api.json')
    // const f = await fetch('http://l12app.test/docs/api.json')
    // const f = await fetch('http://reproduction.test/docs/api.json')
    // const f = await fetch('http://l12.test/docs/api.json')
    documentUrl.value = f.url === new URL('/converterer/openapi.json', window.location.href).href
      ? 'https://api.converterer.com/openapi.json' : f.url
    return await f.json()
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
