<script setup lang="ts">
import type {Components, Header, Parameter, Response, Schema as SchemaType} from "../types";
import MediaType from "../MediaType.vue";
import Description from "../Description.vue";
import Schema from "../Schema.vue";

const props = defineProps<{
  unreferencedResponse: Response,
  components: Components,
}>()

const transformHeadersToSchema = (headers: Record<string, Header>): SchemaType => {
  return {
    type: 'object',
    properties: Object.keys(headers).reduce<Record<string, SchemaType>>((acc, headerName) => {
      acc[headerName] = {
        ...headers[headerName],
        ...(headers[headerName].schema ?? {})
      }
      return acc
    }, {})
  }
}
</script>

<template>
<div>
  <Description v-if="unreferencedResponse.description" class="text-gray-900 leading-5 text-sm" :content="unreferencedResponse.description"/>
  <div v-if="unreferencedResponse.headers" class="mt-6">
    <div class="flex">
      <div class="flex gap-2 items-baseline">
        <div class="font-medium text-gray-900 text-base">Headers</div>
      </div>
    </div>
    <div class="mt-3">
      <Schema
          :components="components"
          :schema="transformHeadersToSchema(unreferencedResponse.headers)"
          :shouldHideMainType="true"
          :shouldDisablePropertiesPadding="true"
      />
    </div>
  </div>
  <div
      v-for="(mediaType, type) of unreferencedResponse.content"
      class="mt-6"
  >
    <MediaType
        :components="components"
        :mediaType="mediaType"
        :type="type"
    />
  </div>
</div>
</template>
