<script setup lang="ts">
import type {Paths, Components, PathItem} from "./types";
import Operation from "./Operation.vue";
import {getInlineOperations} from "./utils";

defineProps<{
  base: string, // todo: should not be here!
  components: Components, // todo: should not be here!
  path: string,
  pathItem: PathItem,
}>()

</script>

<template>
  <div class="space-y-40">
    <div v-for="{operation, method} of getInlineOperations({[path]: pathItem})" :key="method">
      <Operation
          :base="base"
          :components="components"
          :method="method"
          :path="path"
          :operation="operation"
      />
    </div>
  </div>
</template>
