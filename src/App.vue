<script setup lang="ts">
import HelloWorld from './components/HelloWorld.vue'

const viewerOptions = {showSchemas: true}
const specUrl = new URLSearchParams(window.location.search).get('spec') || undefined
</script>

<template>
  <HelloWorld :showSchemas="viewerOptions.showSchemas" :spec-url="specUrl" />
</template>
