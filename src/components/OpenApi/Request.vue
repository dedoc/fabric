<script setup lang="ts">
import type {Paths, Components, PathItem, RequestBody as RequestBodyType, Parameter} from "./types";
import Operation from "./Operation.vue";
import MediaType from "./MediaType.vue";
import Parameters from "./Parameters.vue";
import RequestBody from "./RequestBody.vue";

defineProps<{
  components: Components, // todo: should not be here!
  parameters?: Parameter[],
  requestBody?: RequestBodyType,
}>()
</script>

<template>
  <div class="space-y-[--sections-gap]">
    <Parameters v-if="parameters?.length" :components="components" :parameters="parameters"/>
    <RequestBody v-if="requestBody" :components="components" :request-body="requestBody"/>
  </div>
</template>
