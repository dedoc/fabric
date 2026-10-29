<script setup lang="ts">
import type {Paths, Components, PathItem, RequestBody as RequestBodyType, Parameter, Reference} from "@/core/openapi/types";
import Operation from "@/components/OpenApi/Operation.vue";
import MediaType from "@/components/OpenApi/MediaType.vue";
import Parameters from "@/components/OpenApi/Parameters.vue";
import RequestBody from "@/components/OpenApi/RequestBody.vue";

defineProps<{
  components: Components, // todo: should not be here!
  parameters?: (Parameter|Reference)[],
  requestBody?: RequestBodyType|Reference,
}>()
</script>

<template>
  <div class="space-y-[--sections-gap]">
    <Parameters v-if="parameters?.length" :components="components" :parameters="parameters"/>
    <RequestBody v-if="requestBody" :components="components" :request-body="requestBody"/>
  </div>
</template>
