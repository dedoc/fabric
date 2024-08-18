<script setup lang="ts">
import type {Paths, Components, PathItem} from "./types";
import Operation from "./Operation.vue";

defineProps<{
  base: string, // todo: should not be here!
  components: Components, // todo: should not be here!
  path: string,
  pathItem: PathItem,
}>()

const operationsFields = ['get', 'post', 'put', 'delete', 'options', 'head', 'patch', 'trace']
</script>

<template>
  <div class="space-y-40">
    <div v-for="(operation, field) of pathItem">
      <Operation
          v-if="operationsFields.includes(field)"
          :base="base"
          :components="components"
          :method="field"
          :path="path"
          :operation="operation"
      />
    </div>
  </div>
</template>
