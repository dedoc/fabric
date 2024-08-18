<script setup lang="ts">
import type {Components, Response} from "../types";
import MediaType from "../MediaType.vue";
import Description from "../Description.vue";

const props = defineProps<{
  unreferencedResponse: Response,
  components: Components,
}>()
</script>

<template>
<div>
  <Description v-if="unreferencedResponse.description" class="text-gray-900 leading-5 text-sm" :content="unreferencedResponse.description"/>
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
