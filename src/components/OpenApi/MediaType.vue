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
    <div class="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-2 gap-y-1 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
      <div class="col-start-1 row-start-1">
        <slot name="title">
          <div class="font-medium text-gray-900 text-base">Body</div>
        </slot>
      </div>
      <div v-if="schemaNamePreview" class="col-span-2 col-start-1 row-start-2 min-w-0 break-words text-base font-normal text-gray-500 sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:text-sm"><SchemaTypePreview :schema="media.schema" :components="components" /></div>
      <Select v-model="type" :options="types.map(value => ({value, label: value}))" class="col-start-2 row-start-1 max-w-full justify-self-end text-base font-normal text-gray-500 sm:col-start-3 sm:text-sm" :aria-label="label ?? 'Body content type'" :title="type" />
    </div>
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
