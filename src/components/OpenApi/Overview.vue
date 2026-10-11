<script setup lang="ts">
import {computed} from 'vue'
import type {Components, Document, Paths, Server} from './types'
import Description from './Description.vue'
import SectionTitle from './Partials/SectionTitle.vue'
import {getInlineOperations} from './utils'
import {resolveSecurityScheme} from './security'
import SecuritySchemeDetails from './Partials/SecuritySchemeDetails.vue'
import {resolveOperationBase} from './servers'
import {resolveReference} from './references'
import type {ReferenceIssue} from './references'
import type {PathItem} from './types'
import ReferenceDiagnostics from './ReferenceDiagnostics.vue'

const props = defineProps<{document: Document, paths: Paths, components: Components, documentUrl?: string}>()
const emit = defineEmits<{navigate: [id: string]}>()
const info = computed(() => props.document.info)
const operations = computed(() => getInlineOperations(props.paths, props.document))

const servers = computed(() => {
  const declared: Server[] = [...(props.document.servers?.length ? props.document.servers : [{url: '/'}])]
  for (const pathItem of Object.values(props.paths)) declared.push(...(resolveReference<PathItem>(props.document, pathItem, 'pathItem').value?.servers ?? []))
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
  const issues: ReferenceIssue[] = []
  return {name, scheme: resolveSecurityScheme(name, props.components, props.document, issue => issues.push(issue)), issues}
}))

const groups = computed(() => {
  const groups = new Map<string, {name: string, id: string, count: number}>()
  for (const operation of operations.value) {
    const name = operation.operation.tags?.[0] ?? 'Endpoints'
    const group = groups.get(name)
    if (group) group.count++
    else groups.set(name, {name, id: operation.id, count: 1})
  }
  const tagOrder = new Map((props.document.tags ?? []).map((tag, index) => [tag.name, index]))
  return [...groups.values()].sort((a, b) => (tagOrder.get(a.name) ?? tagOrder.size) - (tagOrder.get(b.name) ?? tagOrder.size))
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
        <p class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ info?.title || 'API documentation' }}</p>
        <h1 class="text-balance text-[clamp(2rem,4vw,3rem)] font-medium tracking-tight">Overview</h1>
        <p v-if="info?.summary" class="prose max-w-[70ch]">{{ info.summary }}</p>
        <Description v-if="info?.description" class="max-w-[70ch]" :content="info.description" />
        <p v-if="!info?.description && !info?.summary" class="prose max-w-[70ch]">
          Explore {{ info?.title ? `the ${info.title}` : 'the API' }}. Find server URLs, authentication details, and endpoint documentation below.
        </p>
      </header>

      <section aria-labelledby="overview-servers" class="space-y-4 border-t border-gray-950/10 dark:border-gray-700 pt-7">
        <SectionTitle id="overview-servers">{{ servers.length > 1 ? 'Servers' : 'Base URL' }}</SectionTitle>
        <ul role="list" class="divide-y divide-gray-950/5 dark:divide-gray-700">
          <li v-for="server in servers" :key="server.url" class="space-y-1 py-3">
            <Description v-if="server.description" :content="server.description" />
            <div class="text-sm text-gray-900 dark:text-gray-100"><code class="font-jetbrains-mono">{{ server.url }}</code></div>
          </li>
        </ul>
        <p v-if="servers.length > 1" class="text-pretty text-sm text-gray-500 dark:text-gray-400">Each endpoint shows the server it uses.</p>
      </section>

      <section v-if="schemes.length" aria-labelledby="overview-auth" class="space-y-4 border-t border-gray-950/10 dark:border-gray-700 pt-7">
        <SectionTitle id="overview-auth">Authentication</SectionTitle>
        <p class="text-pretty text-sm text-gray-600 dark:text-gray-400">Check each endpoint for its authentication requirements.</p>
        <div class="divide-y divide-gray-950/5 dark:divide-gray-700">
          <div v-for="{name, scheme, issues} in schemes" :key="name" class="space-y-3 py-4 first:pt-0 last:pb-0">
            <ReferenceDiagnostics :issues="issues" />
            <SecuritySchemeDetails :name="name" :scheme="scheme" />
          </div>
        </div>
      </section>

      <section v-if="groups.length" aria-labelledby="overview-reference" class="space-y-4 border-t border-gray-950/10 dark:border-gray-700 pt-7">
        <SectionTitle id="overview-reference">Explore the API</SectionTitle>
        <ul role="list" class="divide-y divide-gray-950/5 dark:divide-gray-700">
          <li v-for="group in groups" :key="group.name">
            <a :href="`#${group.id}`" class="flex min-h-12 items-baseline justify-between gap-4 py-3 text-base text-gray-900 dark:text-gray-100 hover:text-gray-500 hover:dark:text-gray-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500 sm:text-sm" @click.prevent="emit('navigate', group.id)">
              <div class="min-w-0 font-medium">{{ group.name }}</div>
              <div class="shrink-0 tabular-nums text-gray-500 dark:text-gray-400">{{ group.count }} {{ group.count === 1 ? 'endpoint' : 'endpoints' }} <span aria-hidden="true">→</span></div>
            </a>
          </li>
        </ul>
      </section>
    </div>

    <aside v-if="hasDetails" aria-label="API details" class="min-w-0 border-t border-gray-950/10 dark:border-gray-700 pt-6">
      <h2 class="text-base font-medium text-gray-900 dark:text-gray-100 sm:text-sm">API details</h2>
      <dl class="mt-5 flex flex-wrap gap-x-12 gap-y-6 text-sm">
        <div v-if="info?.version" class="space-y-1">
          <dt class="font-medium text-gray-900 dark:text-gray-100">Version</dt>
          <dd class="tabular-nums text-gray-500 dark:text-gray-400">{{ info.version }}</dd>
        </div>
        <div v-if="document.openapi" class="space-y-1">
          <dt class="font-medium text-gray-900 dark:text-gray-100">Specification</dt>
          <dd class="text-gray-500 dark:text-gray-400">OpenAPI {{ document.openapi }}</dd>
        </div>
        <div v-if="info?.license" class="space-y-1">
          <dt class="font-medium text-gray-900 dark:text-gray-100">License</dt>
          <dd class="text-gray-500 dark:text-gray-400"><a v-if="link(info.license.url)" :href="link(info.license.url)" target="_blank" rel="noopener noreferrer" class="underline underline-offset-4 hover:text-gray-900 hover:dark:text-gray-100">{{ info.license.name }}</a><template v-else>{{ info.license.name }}</template></dd>
        </div>
      </dl>
      <ul v-if="resources.length || info?.contact?.email" role="list" class="mt-6 space-y-3 border-t border-gray-950/10 dark:border-gray-700 pt-5 text-sm text-gray-600 dark:text-gray-400">
        <li v-for="resource in resources" :key="resource.url"><a :href="resource.url" target="_blank" rel="noopener noreferrer" class="underline underline-offset-4 hover:text-gray-900 hover:dark:text-gray-100">{{ resource.label }}</a></li>
        <li v-if="info?.contact?.email"><a :href="`mailto:${encodeURIComponent(info.contact.email)}`" class="underline underline-offset-4 hover:text-gray-900 hover:dark:text-gray-100">{{ info.contact.email }}</a></li>
      </ul>
    </aside>
  </article>
</template>
