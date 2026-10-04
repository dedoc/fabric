<script setup lang="ts">
import type {Components, RequestBody} from "./types";
import MediaType from "./MediaType.vue";
import SectionTitle from "./Partials/SectionTitle.vue";
import SchemaTypePreview from "./SchemaTypePreview.vue";

defineProps<{
  components: Components, // todo: should not be here!
  requestBody: RequestBody,
}>()
</script>

<template>
  <div>
    <div
        v-for="(mediaType, type) of requestBody.content"
        class="mt-5"
    >
      <MediaType
          :components="components"
          :mediaType="mediaType"
          :type="String(type)"
      >
        <template #header="{ schemaNamePreview }">
          <SectionTitle>
            <div class="flex justify-between">
              <div class="flex gap-2 items-baseline">
                <div>Request Body</div>
                <div v-if="schemaNamePreview" class="text-[#8A8A8A] text-sm font-normal"><SchemaTypePreview :schema="mediaType.schema" :components="components" /></div>
              </div>
              <div class="text-[#8A8A8A] text-sm font-normal">
                {{ type }}
              </div>
            </div>
          </SectionTitle>
        </template>
      </MediaType>
    </div>
  </div>
</template>
