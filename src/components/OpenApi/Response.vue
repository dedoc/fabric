<script setup lang="ts">
import type {Paths, Components, PathItem, Response, Reference, Parameter} from "./types";
import MediaType from "./MediaType.vue";
import Description from "./Description.vue";
import {computed, ref} from "vue";
import {useReferences} from './useReferences'
import ReferenceDiagnostics from './ReferenceDiagnostics.vue'
import ResponseHeader from "./Partials/ResponseHeader.vue";
import ResponseContent from "./Partials/ResponseContent.vue";
import ToggleButton from "./Partials/ToggleButton.vue";

const props = defineProps<{
  components: Components, // todo: should not be here!
  statusCode: number,
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
<!--      <template v-if="! isExpanded && props.secondary && unreferencedResponse.description">-->
<!--        <div class="text-gray-300 shrink-0">·</div>-->
<!--        <div class="text-gray-500 truncate min-w-0"><span>{{ unreferencedResponse.description }}</span></div>-->
<!--      </template>-->
      <ToggleButton v-if="props.secondary" class="ml-auto shrink-0" v-model:expanded="isExpanded" label="body"/>
    </ResponseHeader>
    <ResponseContent v-if="isExpanded" class="mt-3" :unreferencedResponse="unreferencedResponse" :status-code="String(statusCode)" :components="components"/>
  </div>
</template>
