<script setup lang="ts">
import type {Components, MediaType} from "./types.ts";
import {computed} from "vue";
import Schema from "./Schema.vue";
import {getSchemaTypePreview} from "./utils.ts";

const props = defineProps<{
  components: Components,
  mediaType: MediaType,
  type: string,
}>()

const schemaNamePreview = computed(() => getSchemaTypePreview(props.mediaType.schema))
</script>

<template>
  <div>
    <slot name="header" :type="type" :schemaNamePreview="schemaNamePreview">
      <div class="flex justify-between">
        <div class="flex gap-2 items-baseline">
          <div class="font-medium text-gray-900 text-base">Body</div>
          <div v-if="schemaNamePreview" class="text-[#8A8A8A] text-sm">{{ schemaNamePreview }}</div>
        </div>
        <div class="text-[#8A8A8A] text-sm">
          {{ type }}
        </div>
      </div>
    </slot>
    <div v-if="mediaType.schema" class="mt-5">
      <Schema
          :components="components"
          :schema="mediaType.schema"
          :shouldHideMainType="true"
          :shouldDisablePropertiesPadding="true"
      />
    </div>
  </div>
</template>

<style scoped>

</style>
