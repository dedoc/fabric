<script setup lang="ts">
import {onMounted, onUnmounted, ref} from 'vue'
import Fabric from '@/index'
import {fetchSpecification} from '@/core/openapi/specification'
import {fabricOptions} from '@/playground/specs'

const props = defineProps<{specUrl?: string}>()

const container = ref<HTMLElement>()
const controller = new AbortController()
let viewer: ReturnType<typeof Fabric.init> | undefined

function mount() {
  if (!container.value) return
  const url = props.specUrl ?? fabricOptions[0].value
  const {value, label, ...options} = fabricOptions.find(spec => spec.value === url)
    ?? {value: url, label: url, openApiDocumentUrl: url}
  viewer = Fabric.init(container.value, {
    ...options,
    ...(value !== options.openApiDocumentUrl ? {
      openApiDocument: async () => JSON.stringify((await fetchSpecification(url, controller.signal)).document),
    } : {}),
  })
}

onMounted(mount)
onUnmounted(() => {
  controller.abort()
  viewer?.destroy()
})
</script>

<template>
  <div ref="container" />
</template>
