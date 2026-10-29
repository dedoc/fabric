<script setup lang="ts">
import MethodChip from "@/components/OpenApi/Partials/MethodChip.vue";
import {OperationNavigation} from "@/components/Layouts/Partials/types.ts";
import NavigationItem from "@/components/Layouts/Partials/NavigationItem.vue";
import WebhookIcon from "@/components/UI/WebhookIcon.vue";

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
      <MethodChip class="flex shrink-0 items-baseline gap-1.5 text-xs !text-gray-400" :method="navigation.method">
        <WebhookIcon v-if="navigation.webhook" class="size-3.5 shrink-0 self-center" />
      </MethodChip>
    </template>
  </NavigationItem>
</template>
