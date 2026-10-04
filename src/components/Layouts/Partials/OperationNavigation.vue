<script setup lang="ts">
import MethodChip from "../../OpenApi/Partials/MethodChip.vue";
import {OperationNavigation} from "./types.ts";

defineProps<{
  isSelected: boolean,
  navigation: OperationNavigation,
}>()

const emit = defineEmits<{
  (e: 'navigate', id: string): void,
}>()
</script>

<template>
  <button
      type="button"
      :aria-current="isSelected ? 'page' : undefined"
      class="w-full text-left flex text-sm p-2 px-2 items-baseline justify-between gap-2.5 rounded-md hover:bg-gray-50 cursor-pointer relative"
      :class="{'bg-gray-50': isSelected}"
      @click="emit('navigate', navigation.id)"
  >
    <div class="truncate text-gray-700" :class="{'text-gray-900': isSelected}">{{ navigation.name }}</div>
    <MethodChip class="text-xs !text-gray-400" :method="navigation.method"/>

  </button>
</template>
