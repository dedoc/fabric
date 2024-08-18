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
  <div
      class="flex text-sm p-2 px-2 items-baseline justify-between gap-2.5 rounded-md hover:bg-gray-50 cursor-pointer relative"
      @click="emit('navigate', navigation.id)"
  >
    <div class="truncate text-gray-700" :class="{'text-gray-900': isSelected}">{{ navigation.name }}</div>
    <MethodChip class="text-xs !text-gray-400" :method="navigation.method"/>
    <div
        v-if="isSelected"
        class="absolute right-[-8px] h-[calc(100%-12px)] top-[6px] w-px bg-[--primary-color] z-10"
    ></div>
  </div>
</template>
