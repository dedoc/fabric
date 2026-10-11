<script setup lang="ts">
import HelloWorld from './components/HelloWorld.vue'
import ComparisonCanvas from './components/ComparisonCanvas.vue'

const specUrl = new URLSearchParams(window.location.search).get('spec') || undefined
const isComparison = new URLSearchParams(window.location.search).get('view') === 'compare'
</script>

<template>
  <ComparisonCanvas v-if="isComparison" />
  <HelloWorld v-else :spec-url="specUrl" />
</template>
