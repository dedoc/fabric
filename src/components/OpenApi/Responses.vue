<script setup lang="ts">
import Response from "./Response.vue";
import {Components, Operation} from "./types.ts";
import SectionTitle from "./Partials/SectionTitle.vue";

const props = defineProps<{
  responses: Operation['responses'],
  components: Components,
}>()

const [primaryResponses, secondaryResponses] = Object.entries(props.responses || {}).reduce(([primary, secondary], response, index) => {
  if (index === 0) {
    primary[response[0]] = response[1]
  } else {
    secondary[response[0]] = response[1]
  }
  return [primary, secondary]
}, [{}, {}])
</script>

<template>
  <div>
    <div class="flex gap-2 items-baseline">
      <SectionTitle>Response</SectionTitle>
    </div>
    <div class="mt-4">
      <Response
          v-for="(response, statusCode) of primaryResponses"
          :components="components"
          :statusCode="statusCode"
          :response="response"
      />
      <div v-if="Object.keys(secondaryResponses).length" class="h-px bg-gray-100 my-5"></div>
      <div v-if="Object.keys(secondaryResponses).length">
        <template v-for="(response, statusCode, i) of secondaryResponses">
          <Response
              :components="components"
              :statusCode="statusCode"
              :response="response"
              :secondary="true"
          />
          <div v-if="i !== Object.keys(secondaryResponses).length - 1" class="h-px bg-gray-100 my-5"></div>
        </template>

      </div>
    </div>
  </div>
</template>
