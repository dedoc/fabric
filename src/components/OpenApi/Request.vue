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
  <div class="mt-5 space-y-10">
<!--    <div class="flex gap-2 items-baseline">-->
<!--      <div class="font-medium text-gray-800">Request</div>-->
<!--      <div v-for="(mediaType, type) of requestBody?.content ?? {}" class="text-gray-400 text-xs">{{ type }}</div>-->
<!--    </div>-->
    <Parameters v-if="parameters" :components="components" :parameters="parameters"/>
    <RequestBody v-if="requestBody" :components="components" :request-body="requestBody"/>
  </div>
</template>
