<script setup lang="ts">
import type {Paths, Components, PathItem, Schema as SchemaType, Parameter, Operation, Reference} from "./types";
import Schema from "./Schema.vue";
import {computed} from "vue";
import {useReferences} from './useReferences'
import ReferenceDiagnostics from './ReferenceDiagnostics.vue'
import SectionTitle from "./Partials/SectionTitle.vue";

const props = defineProps<{
  components: Components, // todo: should not be here!
  parameters: (Reference|Parameter)[],
}>()

const references = useReferences(() => props.components)
const resolutions = computed(() => props.parameters.map(p => references.resolve<Parameter>(p)))
const issues = computed(() => resolutions.value.flatMap(result => result.issues))
const unreferencedParameters = computed(() => resolutions.value.flatMap(result => result.value ? [result.value] : []))

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
    properties: params.reduce<Record<string, SchemaType>>((acc, p) => {
      acc[p.name] = {
        description: p.description,
        ...p.schema,
      }
      return acc
    }, {}),
    required: params.filter(p => p.required).map(p => p.name),
  }
}
</script>

<template>
  <div class="space-y-[--sections-gap]">
    <ReferenceDiagnostics :issues="issues" />
    <div v-for="(params, group) of groupedParameters">
      <div class="flex gap-1.5 items-baseline">
        <SectionTitle class="capitalize">
          {{ group }} Parameters
        </SectionTitle>
      </div>
      <div class="mt-4">
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
