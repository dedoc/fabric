<script setup lang="ts">
import type {Paths, Components} from "./types";
import PathItem from "./PathItem.vue";

defineProps<{
  base: string, // todo: should not be here!
  components: Components, // todo: should not be here!
  paths: Paths,
}>()
</script>

<template>
<div v-for="(pathItem, path) of paths">
  <PathItem
    :base="base"
    :components="components"
    :path="path"
    :pathItem="pathItem"
  />
</div>
</template>
