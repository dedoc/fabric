<script setup lang="ts">
import type {Components, Parameter, Reference} from "@/core/openapi/types";
import ParameterDetails from '@/components/OpenApi/ParameterDetails.vue'
import {computed} from "vue";
import {useReferences} from '@/components/OpenApi/useReferences'
import ReferenceDiagnostics from '@/components/OpenApi/ReferenceDiagnostics.vue'
import SectionTitle from "@/components/OpenApi/Partials/SectionTitle.vue";

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

</script>

<template>
  <div class="space-y-[--sections-gap]">
    <ReferenceDiagnostics :issues="issues" />
    <div v-for="(params, group) of groupedParameters" :key="group">
      <div class="flex gap-1.5 items-baseline">
        <SectionTitle class="capitalize">
          {{ group }} Parameters
        </SectionTitle>
      </div>
      <div class="mt-4 divide-y divide-[color:var(--schema-border-color)]">
        <ParameterDetails v-for="parameter in params" :key="parameter.name" class="py-3 first:pt-0 last:pb-0" :parameter="parameter" :components="components" />
      </div>
    </div>
  </div>
</template>
