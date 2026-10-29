<script setup lang="ts">
import {computed} from "vue";
import {renderDescription} from '@/core/openapi/descriptionHtml'
import {theme} from '@/utils/theme'

const props = defineProps<{
  content: string,
}>()

const renderedContent = computed(() => renderDescription(props.content, theme.value))
</script>

<template>
<div class="prose" v-html="renderedContent"></div>
</template>
