<script setup lang="ts">
import {computed} from 'vue'
import type {Components, Document, Paths, Server} from './types'
import Description from './Description.vue'
import SectionTitle from './Partials/SectionTitle.vue'
import {getInlineOperations} from './utils'
import {resolveSecurityScheme} from './security'
import SecuritySchemeDetails from './Partials/SecuritySchemeDetails.vue'
import {resolveOperationBase} from './servers'

const props = defineProps<{document: Document, paths: Paths, components: Components, documentUrl?: string}>()
const emit = defineEmits<{navigate: [id: string]}>()
const info = computed(() => props.document.info)
const operations = computed(() => getInlineOperations(props.paths))

const servers = computed(() => {
  const declared: Server[] = [...(props.document.servers?.length ? props.document.servers : [{url: '/'}])]
  for (const pathItem of Object.values(props.paths)) declared.push(...(pathItem.servers ?? []))
  for (const {operation} of operations.value) declared.push(...(operation.servers ?? []))
  const seen = new Set<string>()
  return declared.flatMap(server => {
    const url = resolveOperationBase([server], {}, {}, props.documentUrl)
    if (seen.has(url)) return []
    seen.add(url)
    return [{url, description: server.description}]
  })
})

const schemes = computed(() => Object.keys(props.components.securitySchemes ?? {}).map(name => {
  return {name, scheme: resolveSecurityScheme(name, props.components)}
}))

const groups = computed(() => {
  const groups = new Map<string, {name: string, id: string, count: number}>()
  for (const operation of operations.value) {
    const name = operation.operation.tags?.[0] ?? 'Endpoints'
    const group = groups.get(name)
    if (group) group.count++
    else groups.set(name, {name, id: operation.id, count: 1})
  }
  return [...groups.values()]
})

// Resolve spec-relative links while keeping metadata links navigable and safe.
function link(url?: string): string | undefined {
  if (!url) return undefined
  try {
    const result = new URL(url, props.documentUrl)
    return ['https:', 'http:'].includes(result.protocol) ? result.href : undefined
  } catch { return undefined }
}
const resources = computed(() => [
  {label: props.document.externalDocs?.description || 'Documentation', url: link(props.document.externalDocs?.url)},
  {label: info.value?.contact?.name || 'Support', url: link(info.value?.contact?.url)},
  {label: 'Terms of service', url: link(info.value?.termsOfService)},
].filter((resource): resource is {label: string, url: string} => !!resource.url))
const hasDetails = computed(() => !!(info.value?.version || props.document.openapi || resources.value.length || info.value?.contact?.email || info.value?.license))
</script>

<template>
  <article class="overview mx-auto grid min-w-0 max-w-[72ch] grid-cols-1 gap-10 pt-6 [overflow-wrap:anywhere]">
    <div class="contents">
      <header class="space-y-4 pb-6">
        <p class="text-sm font-medium text-gray-500">{{ info?.title || 'API documentation' }}</p>
        <h1 class="text-balance text-[clamp(2rem,4vw,3rem)] font-medium tracking-tight">Overview</h1>
        <p v-if="info?.summary" class="max-w-[70ch] text-pretty text-base text-gray-600">{{ info.summary }}</p>
        <Description v-if="info?.description" class="max-w-[70ch]" :content="info.description" />
        <p v-if="!info?.description && !info?.summary" class="max-w-[70ch] text-pretty text-base text-gray-600 sm:text-sm">
          Explore {{ info?.title ? `the ${info.title} API` : 'the API' }}. Find server URLs, authentication details, and endpoint documentation below.
        </p>
      </header>

      <section aria-labelledby="overview-servers" class="space-y-4 border-t border-gray-950/10 pt-7">
        <SectionTitle id="overview-servers">{{ servers.length > 1 ? 'Servers' : 'Base URL' }}</SectionTitle>
        <ul role="list" class="divide-y divide-gray-950/5">
          <li v-for="server in servers" :key="server.url" class="space-y-1 py-3">
            <Description v-if="server.description" :content="server.description" />
            <div class="text-sm text-gray-900"><code class="font-jetbrains-mono">{{ server.url }}</code></div>
          </li>
        </ul>
        <p v-if="servers.length > 1" class="text-pretty text-base text-gray-500 sm:text-sm">Each endpoint shows the server it uses.</p>
      </section>

      <section v-if="schemes.length" aria-labelledby="overview-auth" class="space-y-4 border-t border-gray-950/10 pt-7">
        <SectionTitle id="overview-auth">Authentication</SectionTitle>
        <p class="text-pretty text-base text-gray-600 sm:text-sm">Check each endpoint for its authentication requirements.</p>
        <div class="divide-y divide-gray-950/5">
          <div v-for="{name, scheme} in schemes" :key="name" class="space-y-3 py-4 first:pt-0 last:pb-0">
            <SecuritySchemeDetails :name="name" :scheme="scheme" />
          </div>
        </div>
      </section>

      <section v-if="groups.length" aria-labelledby="overview-reference" class="space-y-4 border-t border-gray-950/10 pt-7">
        <SectionTitle id="overview-reference">Explore the API</SectionTitle>
        <ul role="list" class="divide-y divide-gray-950/5">
          <li v-for="group in groups" :key="group.name">
            <a :href="`#${group.id}`" class="flex min-h-12 items-baseline justify-between gap-4 py-3 text-base text-gray-900 hover:text-gray-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500 sm:text-sm" @click.prevent="emit('navigate', group.id)">
              <div class="min-w-0 font-medium">{{ group.name }}</div>
              <div class="shrink-0 tabular-nums text-gray-500">{{ group.count }} {{ group.count === 1 ? 'endpoint' : 'endpoints' }} <span aria-hidden="true">→</span></div>
            </a>
          </li>
        </ul>
      </section>
    </div>

    <aside v-if="hasDetails" aria-label="API details" class="min-w-0 border-t border-gray-950/10 pt-6">
      <h2 class="text-base font-medium text-gray-900 sm:text-sm">API details</h2>
      <dl class="mt-5 flex flex-wrap gap-x-12 gap-y-6 text-base sm:text-sm">
        <div v-if="info?.version" class="space-y-1">
          <dt class="font-medium text-gray-900">Version</dt>
          <dd class="tabular-nums text-gray-500">{{ info.version }}</dd>
        </div>
        <div v-if="document.openapi" class="space-y-1">
          <dt class="font-medium text-gray-900">Specification</dt>
          <dd class="text-gray-500">OpenAPI {{ document.openapi }}</dd>
        </div>
        <div v-if="info?.license" class="space-y-1">
          <dt class="font-medium text-gray-900">License</dt>
          <dd class="text-gray-500"><a v-if="link(info.license.url)" :href="link(info.license.url)" target="_blank" rel="noopener noreferrer" class="underline underline-offset-4 hover:text-gray-900">{{ info.license.name }}</a><template v-else>{{ info.license.name }}</template></dd>
        </div>
      </dl>
      <ul v-if="resources.length || info?.contact?.email" role="list" class="mt-6 space-y-3 border-t border-gray-950/10 pt-5 text-base text-gray-600 sm:text-sm">
        <li v-for="resource in resources" :key="resource.url"><a :href="resource.url" target="_blank" rel="noopener noreferrer" class="underline underline-offset-4 hover:text-gray-900">{{ resource.label }}</a></li>
        <li v-if="info?.contact?.email"><a :href="`mailto:${encodeURIComponent(info.contact.email)}`" class="underline underline-offset-4 hover:text-gray-900">{{ info.contact.email }}</a></li>
      </ul>
    </aside>
  </article>
</template>
