<script setup lang="ts">
import {Navigation} from "./types.ts";
import OperationNavigation from "./OperationNavigation.vue";
import FolderNavigation from "./FolderNavigation.vue";

defineProps<{
  navigation: Navigation,
  selectedId?: string,
}>()

const emit = defineEmits<{
  (e: 'navigate', id: string): void,
}>()
</script>

<template>
  <OperationNavigation
      v-if="navigation.type === 'operation'"
      :is-selected="navigation.id === selectedId"
      :navigation="navigation"
      @navigate="emit('navigate', $event)"
  />
  <FolderNavigation
      v-if="navigation.type === 'folder'"
      :navigation="navigation"
      :selected-id="selectedId"
      @navigate="emit('navigate', $event)"
  />
</template>
