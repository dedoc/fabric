<script setup lang="ts">
import type {Components, RequestBody, Reference} from "./types";
import {computed} from 'vue'
import {useReferences} from './useReferences'
import ReferenceDiagnostics from './ReferenceDiagnostics.vue'
import MediaType from "./MediaType.vue";
import SectionTitle from "./Partials/SectionTitle.vue";

const props = defineProps<{
  components: Components, // todo: should not be here!
  requestBody: RequestBody|Reference,
}>()
const references = useReferences(() => props.components)
const resolution = computed(() => references.resolve<RequestBody>(props.requestBody))
</script>

<template>
  <ReferenceDiagnostics :issues="resolution.issues" />
  <MediaType v-if="resolution.value" :components="components" :content="resolution.value.content" selection-key="request" label="Request body content type">
    <template #title><SectionTitle>Request Body</SectionTitle></template>
  </MediaType>
</template>
