<script setup lang="ts">
import {computed} from 'vue'
import type {SecurityScheme} from '../types'
import Description from '../Description.vue'
import {securitySchemeLabel} from '../security'

const props = defineProps<{name: string, scheme?: SecurityScheme, scopes?: string[]}>()
const httpScheme = computed(() => props.scheme?.type === 'http' ? props.scheme.scheme.toLowerCase() : '')
const oauthFlows = computed(() => {
  if (props.scheme?.type !== 'oauth2') return []
  const labels: Record<string, string> = {authorizationCode: 'Authorization code', clientCredentials: 'Client credentials', implicit: 'Implicit', password: 'Password'}
  return Object.entries(props.scheme.flows).map(([name, flow]) => {
    const scopes = Object.entries(flow.scopes ?? {}).filter(([scope]) => scope.trim())
      .map(([scope, description]) => description.trim() ? `${scope} — ${description}` : scope).join('\n')
    return {name, rows: [
      {label: 'Flow', value: labels[name] ?? name},
      {label: 'Authorization URL', value: flow.authorizationUrl},
      {label: 'Token URL', value: flow.tokenUrl},
      {label: 'Refresh URL', value: flow.refreshUrl},
      {label: 'Scopes', value: scopes},
    ].filter(row => row.value?.trim())}
  })
})
const bearerFormat = computed(() => props.scheme?.type === 'http' && httpScheme.value === 'bearer' ? props.scheme.bearerFormat?.trim() : undefined)
const requiredScopes = computed(() => props.scopes?.filter(scope => scope.trim()) ?? [])
const discoveryUrl = computed(() => {
  if (props.scheme?.type !== 'openIdConnect' || !props.scheme.openIdConnectUrl) return undefined
  try {
    const url = new URL(props.scheme.openIdConnectUrl)
    return ['https:', 'http:'].includes(url.protocol) ? url.href : undefined
  } catch { return undefined }
})
</script>

<template>
  <div class="min-w-0 space-y-1 text-sm leading-5 text-gray-700 [overflow-wrap:anywhere]">
    <div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <h3 class="font-medium text-gray-900">{{ securitySchemeLabel(scheme) }}</h3>
      <div class="text-gray-500">{{ name }}</div>
    </div>
    <Description v-if="scheme?.description?.trim()" class="leading-5" :content="scheme.description" />
    <template v-if="httpScheme === 'basic'">
      <p class="text-pretty">Send an <code class="font-jetbrains-mono">Authorization</code> header with <code class="font-jetbrains-mono">Basic</code> followed by the Base64-encoded <code class="font-jetbrains-mono">username:password</code>.</p>
    </template>
    <template v-else-if="scheme?.type === 'oauth2'">
      <dl v-for="flow in oauthFlows" :key="flow.name" class="grid min-w-0 grid-cols-[7.5rem_minmax(0,1fr)] gap-x-3 gap-y-2 pt-2 text-xs leading-4">
        <template v-for="row in flow.rows" :key="row.label">
          <dt class="text-gray-500">{{ row.label }}</dt>
          <dd class="min-w-0 whitespace-pre-line" :class="row.label === 'Flow' ? '' : 'font-jetbrains-mono'">{{ row.value }}</dd>
        </template>
      </dl>
    </template>
    <dl v-else-if="httpScheme === 'bearer' && bearerFormat" class="grid min-w-0 grid-cols-[7.5rem_minmax(0,1fr)] gap-x-3 gap-y-2 pt-2 text-xs leading-4">
      <dt class="text-gray-500">Format</dt>
      <dd class="min-w-0 font-jetbrains-mono">{{ bearerFormat }}</dd>
    </dl>
    <p v-else-if="scheme?.type === 'openIdConnect'" class="text-pretty">Send the access token in the <code class="font-jetbrains-mono">Authorization: Bearer &lt;token&gt;</code> header.</p>
    <p v-else-if="scheme?.type === 'apiKey'" class="text-pretty">Send your API key in the <code class="font-jetbrains-mono">{{ scheme.name }}</code> {{ scheme.in === 'query' ? 'query parameter' : scheme.in }}.</p>
    <p v-else-if="scheme?.type === 'http' && httpScheme !== 'bearer'" class="text-pretty">Use the {{ scheme.scheme }} HTTP authentication scheme.</p>
    <p v-else-if="!scheme" class="text-pretty">This specification references an authentication scheme that could not be resolved. Check with the API provider for instructions.</p>
    <dl v-if="requiredScopes.length" class="grid min-w-0 grid-cols-[7.5rem_minmax(0,1fr)] gap-x-3 gap-y-2 pt-2 text-xs leading-4">
      <dt class="text-gray-500">Required scopes</dt>
      <dd class="min-w-0"><ul role="list" class="flex flex-wrap gap-x-3 gap-y-1 text-gray-600">
        <li v-for="scope in requiredScopes" :key="scope"><code class="font-jetbrains-mono">{{ scope }}</code></li>
      </ul></dd>
    </dl>
    <p v-if="discoveryUrl"><a :href="discoveryUrl" class="text-gray-600 underline underline-offset-4 hover:text-gray-900" target="_blank" rel="noopener noreferrer">OpenID Connect configuration</a></p>
  </div>
</template>
