<script setup lang="ts">
import {InjectionKey, onMounted, provide, ref} from 'vue'
import Pages from "./Layouts/Pages.vue";
import {documentKey} from "../utils/symbols.ts";

defineProps<{ msg: string }>()

const document = ref(null)

onMounted(async () => {
  async function getDocument () {
    // const f = await fetch('https://raw.githubusercontent.com/box/box-openapi/main/openapi.json')
    const f = await fetch('http://demo-scramble-pro.test/docs/api.json')
    // const f = await fetch('http://127.0.0.1:8000/docs/api.json')
    // const f = await fetch('http://l12app.test/docs/api.json')
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
      :base="document.servers[0].url"
      :components="document.components"
      :paths="document.paths"
  />
</template>
