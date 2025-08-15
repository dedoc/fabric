<script setup lang="ts">
import {onMounted, ref} from 'vue'
import Pages from "./Layouts/Pages.vue";

defineProps<{ msg: string }>()

const document = ref(null)

onMounted(async () => {
  async function getDocument () {
    // const f = await fetch('https://raw.githubusercontent.com/box/box-openapi/main/openapi.json')
    const f = await fetch('http://demo-scramble-pro.test/docs/api.json')
    // const f = await fetch('http://127.0.0.1:8000/docs/api.json')
    return await f.json()
  }

  document.value = await getDocument()
})

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
