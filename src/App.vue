<script setup lang="ts">
import HelloWorld from './components/HelloWorld.vue'

const viewerOptions = {showSchemas: true}
</script>

<template>
  <HelloWorld msg="Vite + Vue" :showSchemas="viewerOptions.showSchemas" />
</template>
