<script setup lang="ts">
import {computed, onMounted, onUnmounted, ref, watch} from 'vue'
import {setTheme} from '../utils/theme'
import {fabricOptions, galaxySpecUrl} from '../playground/specs'

function syncTheme(event: StorageEvent) {
  if (event.key === 'fabric-theme' && (event.newValue === 'light' || event.newValue === 'dark')) {
    setTheme(event.newValue)
  }
}
onMounted(() => window.addEventListener('storage', syncTheme))
onUnmounted(() => window.removeEventListener('storage', syncTheme))

const specs = [...fabricOptions]
const renderers = [
  {value: 'fabric', label: 'Fabric'},
  {value: 'elements', label: 'Stoplight Elements'},
  {value: 'redoc', label: 'Redoc 2.5.2'},
  {value: 'redoc3', label: 'Redoc 3.0.0-rc.0'},
  {value: 'swagger', label: 'Swagger UI'},
  {value: 'scalar', label: 'Scalar'},
  {value: 'rapidoc', label: 'RapiDoc'},
  {value: 'explorer', label: 'OpenAPI Explorer'},
]
const query = new URLSearchParams(window.location.search)
const requestedSpec = query.get('spec')
const initialSpec = requestedSpec === 'https://galaxy.scalar.com/openapi.json' ? galaxySpecUrl : requestedSpec
if (initialSpec && !specs.some(spec => spec.value === initialSpec)) {
  try {
    const url = new URL(initialSpec, window.location.href)
    if (['http:', 'https:'].includes(url.protocol)) specs.push({value: initialSpec, label: initialSpec, openApiDocumentUrl: initialSpec})
  } catch { /* Use the default fixture for malformed URLs. */ }
}
const spec = ref(specs.find(spec => spec.value === initialSpec)?.value ?? specs[0].value)
const renderer = ref(renderers.find(renderer => renderer.value === query.get('renderer'))?.value ?? 'fabric')
const loading = ref(true)
const rendererName = computed(() => renderers.find(option => option.value === renderer.value)?.label ?? '')
const source = computed(() => {
  const url = new URL(renderer.value === 'fabric' ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}renderer.html`, window.location.origin)
  url.searchParams.set('spec', spec.value)
  if (renderer.value !== 'fabric') url.searchParams.set('renderer', renderer.value)
  return url.href
})
watch([spec, renderer], () => {
  loading.value = true
  const url = new URL(window.location.href)
  url.searchParams.set('spec', spec.value)
  url.searchParams.set('renderer', renderer.value)
  window.history.replaceState(null, '', url)
}, {immediate: true})
</script>

<template>
  <div class="flex h-dvh flex-col overflow-hidden bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
    <header class="z-10 flex shrink-0 flex-wrap items-center gap-x-6 gap-y-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 sm:px-6">
      <span class="text-sm font-semibold">API comparison</span>
      <label class="flex min-w-0 flex-1 items-center gap-2 text-sm sm:flex-none">
        <span class="text-gray-500 dark:text-gray-400">Spec</span>
        <select v-model="spec" class="min-h-9 min-w-0 flex-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 py-1.5 pl-2 pr-7 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-gray-500 sm:max-w-96" aria-label="Specification">
          <option v-for="option in specs" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
      </label>
      <label class="flex items-center gap-2 text-sm">
        <span class="text-gray-500 dark:text-gray-400">Renderer</span>
        <select v-model="renderer" class="min-h-9 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 py-1.5 pl-2 pr-7 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-gray-500" aria-label="OpenAPI renderer">
          <option v-for="option in renderers" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
      </label>
    </header>
    <main class="relative min-h-0 flex-1" :aria-label="`${rendererName} preview`">
      <p v-if="loading" class="absolute inset-0 grid place-content-center bg-white dark:bg-gray-950 text-sm text-gray-500 dark:text-gray-400" role="status">Loading {{ rendererName }}…</p>
      <iframe :key="source" :src="source" :title="`${rendererName} API reference`" class="h-full w-full border-0 bg-white dark:bg-gray-950" @load="loading = false" />
    </main>
  </div>
</template>
