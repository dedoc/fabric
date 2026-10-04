<script setup lang="ts">
import MethodChip from "../../OpenApi/Partials/MethodChip.vue";
import {OperationNavigation} from "./types.ts";
import NavigationItem from "./NavigationItem.vue";

defineProps<{
  isSelected: boolean,
  navigation: OperationNavigation,
}>()

const emit = defineEmits<{
  (e: 'navigate', id: string): void,
}>()
</script>

<template>
  <NavigationItem
      :label="navigation.name"
      :active="isSelected"
      alignment="baseline"
      :aria-current="isSelected ? 'page' : undefined"
      @click="emit('navigate', navigation.id)"
  >
    <template #trailing>
      <MethodChip class="shrink-0 text-xs !text-gray-400" :method="navigation.method"/>
    </template>
  </NavigationItem>
</template>
