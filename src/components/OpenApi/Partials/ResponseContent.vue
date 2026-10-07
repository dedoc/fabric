<script setup lang="ts">
import type {Components, Header, Parameter, Response, Schema as SchemaType} from "../types";
import MediaType from "../MediaType.vue";
import Description from "../Description.vue";
import Schema from "../Schema.vue";

const props = defineProps<{
  unreferencedResponse: Response,
  components: Components,
  statusCode?: string,
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
<div class="space-y-5">
  <Description v-if="unreferencedResponse.description" :content="unreferencedResponse.description"/>
  <div v-if="unreferencedResponse.headers">
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
  <MediaType :components="components" :content="unreferencedResponse.content" :selection-key="`response:${statusCode ?? 'default'}`" label="Response body content type" />
</div>
</template>
