<script setup lang="ts">
import {computed} from 'vue'
import type {SecurityScheme} from '../types'
import Description from '../Description.vue'
import {securitySchemeLabel} from '../security'

const props = defineProps<{name: string, scheme?: SecurityScheme, scopes?: string[]}>()
const httpScheme = computed(() => props.scheme?.type === 'http' ? props.scheme.scheme.toLowerCase() : '')
const tokenAuth = computed(() => httpScheme.value === 'bearer' || ['oauth2', 'openIdConnect'].includes(props.scheme?.type ?? ''))
const discoveryUrl = computed(() => {
  if (props.scheme?.type !== 'openIdConnect' || !props.scheme.openIdConnectUrl) return undefined
  try {
    const url = new URL(props.scheme.openIdConnectUrl)
    return ['https:', 'http:'].includes(url.protocol) ? url.href : undefined
  } catch { return undefined }
})
</script>

<template>
  <div class="min-w-0 space-y-1 text-base leading-5 text-gray-700 sm:text-sm sm:leading-5 [overflow-wrap:anywhere]">
    <div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <h3 class="font-medium text-gray-900">{{ securitySchemeLabel(scheme) }}</h3>
      <div class="text-gray-500">{{ name }}</div>
    </div>
    <Description v-if="scheme?.description" class="leading-5" :content="scheme.description" />
    <template v-if="httpScheme === 'basic'">
      <p class="text-pretty">Send an <code class="font-jetbrains-mono">Authorization</code> header with <code class="font-jetbrains-mono">Basic</code> followed by the Base64-encoded <code class="font-jetbrains-mono">username:password</code>.</p>
    </template>
    <template v-else-if="tokenAuth">
      <p class="text-pretty">Send the access token in the <code class="font-jetbrains-mono">Authorization: Bearer &lt;token&gt;</code> header.</p>
      <p v-if="scheme?.type === 'http' && scheme.bearerFormat">Token format: {{ scheme.bearerFormat }}.</p>
    </template>
    <p v-else-if="scheme?.type === 'apiKey'" class="text-pretty">Send your API key in the <code class="font-jetbrains-mono">{{ scheme.name }}</code> {{ scheme.in === 'query' ? 'query parameter' : scheme.in }}.</p>
    <p v-else-if="scheme?.type === 'http'" class="text-pretty">Use the {{ scheme.scheme }} HTTP authentication scheme.</p>
    <p v-else-if="!scheme" class="text-pretty">This specification references an authentication scheme that could not be resolved. Check with the API provider for instructions.</p>
    <div v-if="scopes?.length" class="space-y-1">
      <p>Required scopes:</p>
      <ul role="list" class="flex flex-wrap gap-x-3 gap-y-1 text-gray-600">
        <li v-for="scope in scopes" :key="scope"><code class="font-jetbrains-mono">{{ scope }}</code></li>
      </ul>
    </div>
    <p v-if="discoveryUrl"><a :href="discoveryUrl" class="text-gray-600 underline underline-offset-4 hover:text-gray-900" target="_blank" rel="noopener noreferrer">OpenID Connect configuration</a></p>
  </div>
</template>
