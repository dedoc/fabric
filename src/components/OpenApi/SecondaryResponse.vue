<script setup lang="ts">
import type {Paths, Components, PathItem, Response, Reference, Parameter} from "./types";
import MediaType from "./MediaType.vue";
import Description from "./Description.vue";
import {computed} from "vue";
import {useReferences} from './useReferences'
import ReferenceDiagnostics from './ReferenceDiagnostics.vue'
import ResponseHeader from './Partials/ResponseHeader.vue'
import {responseStatusDescription} from './responseStatus'

const props = defineProps<{
  components: Components, // todo: should not be here!
  statusCode: number,
  response: Response|Reference,
}>()

const references = useReferences(() => props.components)
const resolution = computed(() => references.resolve<Response>(props.response))
const unreferencedResponse = computed(() => resolution.value.value)
</script>

<template>
  <ReferenceDiagnostics :issues="resolution.issues" />
  <div v-if="unreferencedResponse">
    <ResponseHeader :status-code="String(statusCode)" />
    <Description v-if="unreferencedResponse.description && unreferencedResponse.description.trim() !== responseStatusDescription(String(statusCode))" class="text-gray-700 mt-4 leading-normal text-sm" :content="unreferencedResponse.description"/>
    <MediaType class="mt-5" :components="components" :content="unreferencedResponse.content" direction="response" :selection-key="`response:${statusCode}`" label="Response body content type" should-hide-examples />
  </div>
</template>
