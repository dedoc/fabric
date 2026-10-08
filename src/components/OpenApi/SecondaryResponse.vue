<script setup lang="ts">
import type {Paths, Components, PathItem, Response, Reference, Parameter} from "./types";
import MediaType from "./MediaType.vue";
import Description from "./Description.vue";
import {computed} from "vue";
import {useReferences} from './useReferences'
import ReferenceDiagnostics from './ReferenceDiagnostics.vue'

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
    <div class="flex items-baseline gap-1.5 text-sm">
      <div class="font-jetbrains-mono rounded-lg leading-[18px] font-medium uppercase border border-green-300 bg-green-50 text-green-600 px-1.5 py-[3px]">
        {{ statusCode }}
      </div>
      <div class="text-gray-300 shrink-0">·</div>
      <div><span class="text-gray-500">OK</span></div>
    </div>
    <Description v-if="unreferencedResponse.description" class="text-gray-700 mt-4 leading-normal text-sm" :content="unreferencedResponse.description"/>
    <MediaType class="mt-5" :components="components" :content="unreferencedResponse.content" :selection-key="`response:${statusCode}`" label="Response body content type" />
  </div>
</template>
