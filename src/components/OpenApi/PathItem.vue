<script setup lang="ts">
import type {Paths, Components, PathItem} from "@/core/openapi/types";
import Operation from "@/components/OpenApi/Operation.vue";
import {getInlineOperations} from "@/core/openapi/utils";
import {computed} from 'vue'
import {useReferences} from '@/components/OpenApi/useReferences'
import ReferenceDiagnostics from '@/components/OpenApi/ReferenceDiagnostics.vue'
import type {ReferenceIssue} from '@/core/openapi/references'

const props = defineProps<{
  base: string, // todo: should not be here!
  components: Components, // todo: should not be here!
  path: string,
  pathItem: PathItem,
}>()
const references = useReferences(() => props.components)
const resolved = computed(() => {
  const issues: ReferenceIssue[] = []
  const operations = getInlineOperations({[props.path]: props.pathItem}, references.document.value, issue => issues.push(issue))
  return {operations, issues}
})

</script>

<template>
  <div class="space-y-40">
    <ReferenceDiagnostics :issues="resolved.issues" />
    <div v-for="{operation, method} of resolved.operations" :key="method">
      <Operation
          :base="base"
          :components="components"
          :method="method"
          :path="path"
          :operation="operation"
      />
    </div>
  </div>
</template>
