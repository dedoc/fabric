<script setup lang="ts">
import type {ReferenceIssue} from './references'
defineProps<{issues: ReferenceIssue[]}>()
</script>

<template>
  <div v-if="issues.length" class="space-y-1 rounded-md bg-amber-50 p-3 text-sm text-amber-900" role="note" aria-label="Reference warning">
    <p v-for="(issue, index) in issues" :key="index">{{ issue.message }}<template v-if="issue.reference">: <code class="break-all">{{ issue.reference }}</code></template>.</p>
  </div>
</template>
