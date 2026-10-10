<script setup lang="ts">
import type {Components, RequestBody, Reference} from "./types";
import {computed} from 'vue'
import {useReferences} from './useReferences'
import ReferenceDiagnostics from './ReferenceDiagnostics.vue'
import MediaType from "./MediaType.vue";
import SectionTitle from "./Partials/SectionTitle.vue";
import Description from './Description.vue'

const props = defineProps<{
  components: Components, // todo: should not be here!
  requestBody: RequestBody|Reference,
}>()
const references = useReferences(() => props.components)
const resolution = computed(() => references.resolve<RequestBody>(props.requestBody))
const hasContent = computed(() => Object.keys(resolution.value.value?.content ?? {}).length > 0)
</script>

<template>
  <ReferenceDiagnostics :issues="resolution.issues" />
  <section v-if="resolution.value" class="space-y-4" aria-label="Request body">
    <MediaType v-if="hasContent" :components="components" :content="resolution.value.content" direction="request" selection-key="request" label="Request body content type" should-hide-examples>
      <template #title>
        <SectionTitle>Request Body</SectionTitle>
      </template>
      <template #type-suffix>
        <span v-if="resolution.value.required" class="text-sm text-amber-700">required</span>
      </template>
      <template v-if="resolution.value.description !== undefined" #description>
        <Description class="text-base leading-normal text-gray-700 sm:text-sm" :content="resolution.value.description" />
      </template>
    </MediaType>
    <template v-else>
      <div class="flex flex-wrap items-baseline gap-2">
        <SectionTitle>Request Body</SectionTitle>
        <span v-if="resolution.value.required" class="text-sm text-amber-700">required</span>
      </div>
      <Description v-if="resolution.value.description" class="text-base leading-normal text-gray-700 sm:text-sm" :content="resolution.value.description" />
    </template>
  </section>
</template>
