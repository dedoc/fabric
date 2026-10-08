<script setup lang="ts">
import type {Components, Schema} from "./types.ts";
import {computed, inject, provide, ref, toRaw} from "vue";
import SchemaAttribute from "./SchemaAttribute.vue";
import SchemaTypePreview from "./SchemaTypePreview.vue";
import {useReferences} from './useReferences'
import ReferenceDiagnostics from './ReferenceDiagnostics.vue'
import {schemaAncestorsKey} from './schemaAncestors'
import Description from "./Description.vue";
import ToggleButton from "./Partials/ToggleButton.vue";

const props = withDefaults(defineProps<{
  shouldHideMainType?: boolean, // used to hide top type for schemas
  shouldHideDescription?: boolean,
  shouldHideExamples?: boolean,
  shouldDisablePropertiesPadding?: boolean, // used to make properties not padded from left for top level objects
  propertyTitle?: string, // when schema is rendered for object property
  propertyRequired?: boolean, // when schema is rendered for object property
  components: Components,
  schema: Schema,
  arePropertiesInitiallyVisible?: boolean,
  level?: number,
}>(), {
  arePropertiesInitiallyVisible: true,
  level: 1,
})

const references = useReferences(() => props.components)
const resolution = computed(() => references.resolve<Schema>(props.schema, 'schema'))
const resolvedSchema = computed(() => resolution.value.value ?? {})
const ancestors = inject(schemaAncestorsKey, computed(() => new Set<object>()))
const recursive = computed(() => ancestors.value.has(toRaw(props.schema)) || (!!resolution.value.value && ancestors.value.has(toRaw(resolution.value.value))))
provide(schemaAncestorsKey, computed(() => {
  const next = new Set(ancestors.value).add(toRaw(props.schema))
  if (resolution.value.value) next.add(toRaw(resolution.value.value))
  return next
}))

const normalizedExamples = computed(() => {
  const examples = [
      ...([resolvedSchema.value?.example].filter(e => typeof e !== 'undefined') as any[]),
      ...(resolvedSchema.value?.examples ?? []),
  ]
  const res = examples.map(example => {
    return typeof example === 'object' && example !== null && ('value' in example) ? example : {value: example}
  }) ?? []

  return res
})

const canGroupExamples = computed(() => normalizedExamples.value.length > 1 && normalizedExamples.value.every(example => !example.description))

const arePropertiesVisible = ref(props.arePropertiesInitiallyVisible)
const alternatives = computed(() => resolvedSchema.value.anyOf ?? resolvedSchema.value.oneOf ?? [])

function isPrimitiveSchema (schema: Schema): boolean {
  return schema.type === 'string' || schema.type === 'number' || schema.type === 'boolean' || schema.type === 'integer'
}

const canHideNestedProperties = computed(() => ! props.shouldHideMainType && (!! resolvedSchema.value?.properties || !!resolvedSchema.value.allOf?.length || alternatives.value.length > 0 || (resolvedSchema.value?.items && ! isPrimitiveSchema(resolvedSchema.value?.items))))
</script>

<template>
  <ReferenceDiagnostics :issues="resolution.issues" />
  <p v-if="recursive" class="text-sm text-gray-500">Recursive schema<template v-if="schema.$ref">: <code class="break-all">{{ schema.$ref }}</code></template>.</p>
  <div v-else-if="resolution.value" class="flex flex-col gap-1.5 empty:hidden">
<!--    <pre class="text-xs">{{resolvedSchema}}</pre>-->
<!--    <pre class="text-xs">{{schema}}</pre>-->
    <div v-if="!shouldHideMainType" class="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-base sm:text-sm">
      <div class="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
        <div v-if="propertyTitle" class="font-medium text-gray-900">{{ propertyTitle }}</div>

        <div class="min-w-0 text-gray-500">
          <SchemaTypePreview :schema="resolvedSchema" :original="schema" :components="components" />
          <template v-if="schema.$ref && alternatives.length">{{ ' ' }}<template v-for="(alternative, index) of alternatives" :key="index"><span v-if="index"> | </span><SchemaTypePreview :schema="alternative" :components="components" /></template></template>
        </div>
        <slot name="type-suffix" />
      </div>
      <div v-if="propertyRequired" class="text-amber-700">required</div>
    </div>
    <slot name="description">
      <Description v-if="resolvedSchema.description && !shouldHideDescription" class="leading-normal" :content="resolvedSchema.description" :class="propertyTitle ? 'text-gray-500' : 'text-gray-700'" />
    </slot>

    <div v-if="
      resolvedSchema.minLength !== undefined
      || resolvedSchema.maxLength !== undefined
      || resolvedSchema.minimum !== undefined
      || resolvedSchema.maximum !== undefined
    " class="flex flex-wrap gap-1">
      <div v-if="resolvedSchema.minLength !== undefined" class="text-gray-600 bg-gray-100 rounded-md leading-[15px] text-xs px-[3px] py-0.5"><span class="common-ligatures">{{ '>='}}</span> {{ resolvedSchema.minLength }} characters</div>
      <div v-if="resolvedSchema.maxLength !== undefined" class="text-gray-600 bg-gray-100 rounded-md leading-[15px] text-xs px-[3px] py-0.5"><span class="common-ligatures">{{ '<='}}</span> {{ resolvedSchema.maxLength }} characters</div>
      <div v-if="resolvedSchema.minimum !== undefined" class="text-gray-600 bg-gray-100 rounded-md leading-[15px] text-xs px-[3px] py-0.5"><span class="common-ligatures">{{ '>='}}</span> {{ resolvedSchema.minimum }}</div>
      <div v-if="resolvedSchema.maximum !== undefined" class="text-gray-600 bg-gray-100 rounded-md leading-[15px] text-xs px-[3px] py-0.5"><span class="common-ligatures">{{ '<='}}</span> {{ resolvedSchema.maximum }}</div>
    </div>

    <div v-if="resolvedSchema.default != undefined || (!shouldHideExamples && normalizedExamples.length)" class="flex flex-col gap-2">
      <SchemaAttribute
          v-if="resolvedSchema.default != undefined"
          title="Default"
          :value="resolvedSchema.default === '' ? '\'\'' : resolvedSchema.default"
      />
      <SchemaAttribute
          v-if="!shouldHideExamples && canGroupExamples"
          title="Examples"
          :value="normalizedExamples.map(example => example.value)"
      />
      <template v-else-if="!shouldHideExamples">
        <SchemaAttribute
            v-for="(example, index) of normalizedExamples"
            :key="index"
            title="Example"
            :value="example.value"
            :description="example.description"
        />
      </template>
    </div>

    <SchemaAttribute v-if="resolvedSchema.const !== undefined" title="Const" :value="resolvedSchema.const" />

    <div v-if="resolvedSchema.enum != undefined && resolvedSchema.enum.length" class="flex flex-col gap-2">
      <SchemaAttribute
          title="Enum"
          :value="resolvedSchema.enum"
      />
    </div>

    <div v-if="canHideNestedProperties" class="relative z-10">
      <ToggleButton v-model:expanded="arePropertiesVisible" :label="alternatives.length ? 'options' : 'properties'"/>
    </div>
    <template v-if="arePropertiesVisible">
      <div v-if="resolvedSchema.properties" :class="[
        shouldDisablePropertiesPadding ? '' : 'relative border-l pl-4',
        shouldHideMainType && resolvedSchema.description && !shouldHideDescription ? 'mt-4' : '',
        'border-gray-100',
      ]">
        <template v-for="(propertySchema, name, i) of resolvedSchema.properties">
          <Schema
              :propertyTitle="name as string"
              :propertyRequired="(resolvedSchema.required ?? []).includes(name as string)"
              :components="components"
              :schema="propertySchema"
              :level="level + 1"
              :arePropertiesInitiallyVisible="level <= 0 && (! (resolvedSchema['x-hiddenProperties'] ?? []).includes(name as string))"
          />
          <div v-if="i !== Object.keys(resolvedSchema.properties).length - 1" class="h-px bg-gray-100 my-3"></div>
        </template>
      </div>
    </template>
    <div v-if="arePropertiesVisible && resolvedSchema.allOf?.length" class="space-y-3" role="group" :aria-label="`${propertyTitle ?? 'Value'} constraints`">
      <p class="text-base text-gray-500 sm:text-sm">Must match all schemas.</p>
      <div v-for="(member, index) in resolvedSchema.allOf" :key="index" class="border-l border-gray-950/10 pl-4">
        <Schema :schema="member" :components="components" :level="level + 1" :are-properties-initially-visible="true" :should-hide-examples="shouldHideExamples" />
      </div>
    </div>
    <div v-if="arePropertiesVisible && alternatives.length" class="space-y-3" role="group" :aria-label="`${propertyTitle ?? 'Value'} options`">
      <p class="text-base text-gray-500 sm:text-sm">{{ resolvedSchema.anyOf ? 'Must match at least one option.' : 'Must match exactly one option.' }}</p>
      <div class="divide-y divide-gray-950/5 border-l border-gray-950/10 pl-4">
        <div v-for="(alternative, index) of alternatives" :key="index" class="py-3 first:pt-0 last:pb-0">
          <Schema
              :propertyTitle="`Option ${index + 1}`"
              :components="components"
              :schema="alternative"
              :level="level + 1"
              :arePropertiesInitiallyVisible="!alternative.$ref"
          />
        </div>
      </div>
    </div>
    <div v-if="(arePropertiesVisible || !canHideNestedProperties) && resolvedSchema.type === 'array' && resolvedSchema.items" class="contents">
      <Schema
          :components="components"
          :schema="resolvedSchema.items"
          :shouldHideMainType="true"
          :level="level + 1"
      />
    </div>
  </div>
</template>

<style scoped>
.common-ligatures {
  --ot-liga: common-ligatures;
  font-variant-ligatures: var(--ot-liga) var(--ot-dlig) var(--ot-calt);
}
</style>
