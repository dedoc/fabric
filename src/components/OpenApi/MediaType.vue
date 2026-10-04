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
    <div class="flex min-w-0 items-baseline justify-between gap-2">
      <div class="flex min-w-0 gap-2 items-baseline">
        <slot name="title">
          <div class="font-medium text-gray-900 text-base">Body</div>
        </slot>
        <div v-if="schemaNamePreview" class="text-[#8A8A8A] text-sm font-normal"><SchemaTypePreview :schema="media.schema" :components="components" /></div>
      </div>
      <Select v-model="type" :options="types.map(value => ({value, label: value}))" class="max-w-[50%] shrink-0 text-gray-500 text-sm font-normal" :aria-label="label ?? 'Body content type'" :title="type" />
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
