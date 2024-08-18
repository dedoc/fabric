<script setup lang="ts">
import MethodChip from "../../OpenApi/Partials/MethodChip.vue";
import {FolderNavigation} from "./types.ts";
import {onMounted, ref} from "vue";
import Navigation from "./Navigation.vue";

const props = defineProps<{
  navigation: FolderNavigation,
  selectedId?: string,
}>()

const emit = defineEmits<{
  (e: 'navigate', id: string): void,
}>()

const isOpened = ref(isSelected(props.navigation, props.selectedId))

// find if the selectedId is in the children recursively
function isSelected (navigation: FolderNavigation, selectedId: string): boolean {
  if (navigation.children.filter(c => c.type !== 'folder').some(child => child.id === selectedId)) {
    return true
  }
  return navigation.children.filter(c => c.type === 'folder').some(child => isSelected(child, selectedId))
}
</script>

<template>
  <div>
    <div
        class="flex text-sm p-2 px-2 items-center gap-1 rounded-md hover:bg-gray-50 cursor-pointer relative"
        @click="isOpened = ! isOpened"
    >
      <svg v-if="!isOpened" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="size-4 opacity-50">
        <path fill-rule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
      </svg>
      <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="size-4 opacity-50">
        <path fill-rule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
      </svg>
      <div class="truncate text-gray-700" :class="{'text-gray-900': 0}">{{ navigation.name }}</div>
    </div>
    <div v-if="isOpened" class="pl-5">
      <Navigation
          v-for="navigationItem of navigation.children"
          :selected-id="selectedId"
          :navigation="navigationItem"
          @navigate="emit('navigate', $event)"
      />
    </div>
  </div>
</template>
