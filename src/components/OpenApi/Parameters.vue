<script setup lang="ts">
import type {Paths, Components, PathItem, Schema as SchemaType, Parameter, Operation, Reference} from "./types";
import Schema from "./Schema.vue";
import {computed} from "vue";
import {unreference} from "./utils.ts";
import SectionTitle from "./Partials/SectionTitle.vue";

const props = defineProps<{
  components: Components, // todo: should not be here!
  parameters: (Reference|Parameter)[],
}>()

const unreferencedParameters = computed(() => props.parameters.map(p => {
  return '$ref' in p ? unreference<Parameter>(p.$ref, props.components) : p
}).filter((p): p is Parameter => !!p))

const groupedParameters = computed(() => unreferencedParameters.value.reduce<Partial<Record<Parameter['in'], Parameter[]>>>((acc, param) => {
  if (! acc[param.in]) {
    acc[param.in] = []
  }
  acc[param.in]!.push(param)
  return acc
}, {}))

const transformParamsToSchema = (params: Parameter[]): SchemaType => {
  return {
    type: 'object',
    properties: params.reduce((acc, p) => {
      acc[p.name] = {
        name: p.name,
        description: p.description,
        required: p.required,
        ...p.schema,
      }
      return acc
    }, {})
  }
}
</script>

<template>
  <div class="space-y-[--sections-gap]">
    <div v-for="(params, group) of groupedParameters">
      <div class="flex gap-1.5 items-baseline">
        <SectionTitle class="capitalize">
          {{ group }} Parameters
        </SectionTitle>
      </div>
      <div class="mt-5">
        <Schema
            :components="components"
            :schema="transformParamsToSchema(params!)"
            :shouldHideMainType="true"
            :shouldDisablePropertiesPadding="true"
        />
      </div>
    </div>
  </div>
</template>
