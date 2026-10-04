<script setup lang="ts">
import type {Components, RequestBody} from "./types";
import MediaType from "./MediaType.vue";
import SectionTitle from "./Partials/SectionTitle.vue";

defineProps<{
  components: Components, // todo: should not be here!
  requestBody: RequestBody,
}>()
</script>

<template>
  <MediaType :components="components" :content="requestBody.content" selection-key="request" label="Request body content type">
    <template #title><SectionTitle>Request Body</SectionTitle></template>
  </MediaType>
</template>
