<script setup lang="ts">
import type {Paths, Components, PathItem, Response, Reference, Parameter} from "./types";
import MediaType from "./MediaType.vue";
import Description from "./Description.vue";
import {computed} from "vue";
import {unreference} from "./utils.ts";

const props = defineProps<{
  components: Components, // todo: should not be here!
  statusCode: number,
  response: Response|Reference,
}>()

const unreferencedResponse = computed(() => {
  return '$ref' in props.response ? unreference<Response>(props.response.$ref, props.components) : props.response
})
</script>

<template>
  <div v-if="unreferencedResponse">
    <div class="flex items-baseline gap-1.5 text-sm">
      <div class="font-jetbrains-mono rounded-lg leading-[18px] font-medium uppercase border border-green-300 bg-green-50 text-green-600 px-1.5 py-[3px]">
        {{ statusCode }}
      </div>
      <div class="text-gray-300 shrink-0">·</div>
      <div><span class="text-gray-500">OK</span></div>
    </div>
    <Description v-if="unreferencedResponse.description" class="text-gray-900 mt-4 leading-5 text-sm" :content="unreferencedResponse.description"/>
    <div
        v-for="(mediaType, type) of unreferencedResponse.content"
        class="mt-5"
    >
      <MediaType
        :components="components"
        :mediaType="mediaType"
        :type="type"
      />
    </div>
  </div>
</template>
