<script setup lang="ts">
import {computed} from "vue";
import {renderDescription} from './descriptionHtml'

const props = defineProps<{
  content: string,
}>()

const renderedContent = computed(() => renderDescription(props.content))
</script>

<template>
<div class="prose" v-html="renderedContent"></div>
</template>
