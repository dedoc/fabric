<script setup lang="ts">
import type {Navigation as NavigationType} from "./types.ts";
import OperationNavigation from "./OperationNavigation.vue";
import FolderNavigation from "./FolderNavigation.vue";
import NavigationItem from './NavigationItem.vue'

defineProps<{
  navigation: NavigationType,
  selectedId?: string,
}>()

const emit = defineEmits<{
  (e: 'navigate', id: string): void,
}>()
</script>

<template>
  <section v-if="navigation.type === 'section'" :aria-label="navigation.name" class="mt-6">
    <div class="mb-3 px-2 text-[13px] font-medium">{{ navigation.name }}</div>
    <Navigation
        v-for="item of navigation.children"
        :key="item.id"
        :navigation="item"
        :selected-id="selectedId"
        @navigate="emit('navigate', $event)"
    />
  </section>
  <NavigationItem
      v-if="navigation.type === 'guide'"
      :label="navigation.name"
      :href="`#${navigation.id}`"
      :active="navigation.id === selectedId"
      :aria-current="navigation.id === selectedId ? 'page' : undefined"
      @click.prevent="emit('navigate', navigation.id)"
  />
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
