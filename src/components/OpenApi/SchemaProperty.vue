<script setup lang="ts">
import SchemaAttribute from "./SchemaAttribute.vue";

type Value = { value: string, description?: string }
const props = defineProps<{
  title: string,
  type: string, // todo more types (how?)
  required?: boolean,
  default?: Value,
  example?: Value,
}>()
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex items-baseline gap-2">
      <div class="flex items-baseline gap-1.5">
        <div class="text-sm text-gray-900">{{ title }}</div>
        <div class="text-gray-400 text-xs">{{ type }}</div>
      </div>
      <div v-if="required" class="text-xs text-orange-400">required</div>
    </div>
    <div class="flex flex-col gap-2">
      <SchemaAttribute
          v-if="props.default"
          title="Default"
          :value="props.default.value"
          :description="props.default.description"
      />
      <SchemaAttribute
          v-if="example"
          title="Example"
          :value="example.value"
          :description="example.description"
      />
    </div>
  </div>
</template>

<style scoped>

</style>
