<script setup lang="ts">
import type {Components, MediaType} from "./types.ts";
import {computed} from "vue";
import Schema from "./Schema.vue";
import SchemaTypePreview from "./SchemaTypePreview.vue";
import {getSchemaTypePreview} from "./utils.ts";
import Select from "../UI/Select.vue";
import {useMediaType} from "./useMediaType";

const props = defineProps<{
  components: Components,
  content?: Record<string, MediaType>,
  label?: string,
  selectionKey?: string,
}>()

const {types, type, media} = useMediaType(() => props.content, () => props.selectionKey ?? '')
const schemaNamePreview = computed(() => getSchemaTypePreview(media.value?.schema))
</script>

<template>
  <div v-if="media">
    <div class="flex min-w-0 flex-wrap items-start justify-between gap-x-4 gap-y-2">
      <div class="flex min-w-fit flex-1 flex-col items-start gap-1">
        <slot name="title">
          <div class="font-medium text-gray-900 text-base">Body</div>
        </slot>
      </div>
      <Select v-model="type" :options="types.map(value => ({value, label: value}))" class="max-w-full shrink-0 text-base font-normal text-gray-500 sm:max-w-[50%] sm:text-sm" :aria-label="label ?? 'Body content type'" :title="type" />
    </div>
    <div v-if="schemaNamePreview" class="mt-1 break-words text-base font-normal text-gray-500 sm:text-sm"><SchemaTypePreview :schema="media.schema" :components="components" /></div>
    <div v-if="media.schema" :key="type" class="mt-4">
      <Schema
          :components="components"
          :schema="media.schema"
          :shouldHideMainType="true"
          :shouldDisablePropertiesPadding="true"
      />
    </div>
  </div>
</template>
