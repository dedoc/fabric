<script setup lang="ts">
import type {Components, Header, Parameter, Response, Schema as SchemaType} from "../types";
import {computed} from 'vue'
import {useReferences} from '../useReferences'
import ReferenceDiagnostics from '../ReferenceDiagnostics.vue'
import MediaType from "../MediaType.vue";
import Description from "../Description.vue";
import Schema from "../Schema.vue";
import {responseStatusDescription} from '../responseStatus'

const props = defineProps<{
  unreferencedResponse: Response,
  components: Components,
  statusCode?: string,
}>()

const references = useReferences(() => props.components)
const headers = computed(() => Object.entries(props.unreferencedResponse.headers ?? {}).map(([name, header]) => ({name, ...references.resolve<Header>(header)})))
const issues = computed(() => headers.value.flatMap(header => header.issues))
const headerSchema = computed<SchemaType>(() => ({
  type: 'object',
  properties: Object.fromEntries(headers.value.flatMap(({name, value}) => value ? [[name, {
    description: value.description,
    ...('schema' in value ? value.schema : 'content' in value ? Object.values(value.content ?? {})[0]?.schema : {}),
  }]] : [])),
}))
</script>

<template>
<div class="space-y-5">
  <ReferenceDiagnostics :issues="issues" />
  <Description v-if="unreferencedResponse.description && unreferencedResponse.description.trim() !== responseStatusDescription(statusCode)" class="-mt-2 leading-normal text-gray-700 dark:text-gray-300" :content="unreferencedResponse.description"/>
  <div v-if="unreferencedResponse.headers">
    <div class="flex">
      <div class="flex gap-2 items-baseline">
        <div class="font-medium text-gray-900 dark:text-gray-100 text-base">Headers</div>
      </div>
    </div>
    <div class="mt-3">
      <Schema
          :components="components"
          :schema="headerSchema"
          direction="response"
          :shouldHideMainType="true"
          :shouldDisablePropertiesPadding="true"
      />
    </div>
  </div>
  <MediaType :components="components" :content="unreferencedResponse.content" direction="response" :selection-key="`response:${statusCode ?? 'default'}`" label="Response body content type" should-hide-examples />
</div>
</template>
