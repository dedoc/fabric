<script setup lang="ts">
import type {Paths, Components, PathItem, Response, Reference, Parameter} from "@/core/openapi/types";
import MediaType from "@/components/OpenApi/MediaType.vue";
import Description from "@/components/OpenApi/Description.vue";
import {computed, ref} from "vue";
import {useReferences} from '@/components/OpenApi/useReferences'
import ReferenceDiagnostics from '@/components/OpenApi/ReferenceDiagnostics.vue'
import ResponseHeader from "@/components/OpenApi/Partials/ResponseHeader.vue";
import ResponseContent from "@/components/OpenApi/Partials/ResponseContent.vue";
import ToggleButton from "@/components/OpenApi/Partials/ToggleButton.vue";

const props = defineProps<{
  components: Components, // todo: should not be here!
  statusCode: string | number,
  response: Response|Reference,
  secondary?: boolean,
}>()

const references = useReferences(() => props.components)
const resolution = computed(() => references.resolve<Response>(props.response))
const unreferencedResponse = computed(() => resolution.value.value)

const isExpanded = ref(! props.secondary)
</script>

<template>
  <ReferenceDiagnostics :issues="resolution.issues" />
  <div v-if="unreferencedResponse" class="">
    <ResponseHeader class="min-w-0" :statusCode="String(statusCode)">
      <ToggleButton v-if="props.secondary" class="ml-auto shrink-0" v-model:expanded="isExpanded" label="body"/>
    </ResponseHeader>
    <ResponseContent v-if="isExpanded" class="mt-4" :unreferencedResponse="unreferencedResponse" :status-code="String(statusCode)" :components="components"/>
  </div>
</template>
