<script setup lang="ts">
import {computed, inject} from 'vue'
import type {Components, Schema} from './types'
import {showSchemasKey} from '../../utils/symbols'
import {getSchemaTypeParts} from './schemaTypePreview'

const props = defineProps<{schema?: Schema, original?: Schema, components: Components}>()
const showSchemas = inject(showSchemasKey, computed(() => false))
const parts = computed(() => getSchemaTypeParts(props.schema, props.original))
</script>

<template>
  <span><template v-for="(part, index) of parts" :key="index"><a v-if="showSchemas && part.schemaName && Object.hasOwn(components.schemas ?? {}, part.schemaName)" :href="`#schemas/${encodeURIComponent(part.schemaName)}`" class="text-inherit no-underline hover:cursor-pointer hover:underline focus-visible:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-500">{{ part.text }}</a><template v-else>{{ part.text }}</template></template></span>
</template>
