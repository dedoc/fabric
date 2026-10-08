<script setup lang="ts">
import type {Components, Schema} from "./types.ts";
import {computed, getCurrentInstance, inject, provide, ref, toRaw} from "vue";
import SchemaAttribute from "./SchemaAttribute.vue";
import SchemaTypePreview from "./SchemaTypePreview.vue";
import {useReferences} from './useReferences'
import ReferenceDiagnostics from './ReferenceDiagnostics.vue'
import {schemaAncestorsKey} from './schemaAncestors'
import Description from "./Description.vue";
import ToggleButton from "./Partials/ToggleButton.vue";
import {schemaDirectionKey, schemaFlag, isSchemaVisible, directionalExample} from './schemaUsage'
import type {SchemaDirection} from './schemaUsage'
import {resolveExampleSchema} from './schemaExamples'
import CompositionTabs from './CompositionTabs.vue'
import {useCompositionSelections} from './useCompositionSelections'
import {compositionPathKey} from './compositionExamples'
import type {SchemaPath} from './compositionExamples'

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
  propertiesExpanded?: boolean,
  collapsible?: boolean,
  level?: number,
  direction?: SchemaDirection,
  schemaPath?: SchemaPath,
}>(), {
  arePropertiesInitiallyVisible: true,
  propertiesExpanded: undefined,
  level: 1,
  schemaPath: () => [],
})
const emit = defineEmits<{'update:propertiesExpanded': [expanded: boolean]}>()

const references = useReferences(() => props.components)
const inheritedDirection = inject(schemaDirectionKey, computed<SchemaDirection>(() => 'neutral'))
const direction = computed(() => props.direction ?? inheritedDirection.value)
provide(schemaDirectionKey, direction)
const resolution = computed(() => references.resolve<Schema>(props.schema, 'schema'))
const resolvedSchema = computed(() => resolution.value.value ?? {})
const visibleProperties = computed(() => Object.fromEntries(Object.entries(resolvedSchema.value.properties ?? {}).filter(([, schema]) => {
  const resolved = resolveExampleSchema(schema, props.components, references.document.value)
  return !resolved || isSchemaVisible(resolved, direction.value)
})))
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

  const exampleSchema = direction.value === 'neutral' ? undefined : resolveExampleSchema(props.schema, props.components, references.document.value)
  return res.map(example => ({...example, value: directionalExample(example.value, exampleSchema, direction.value)}))
})

const canGroupExamples = computed(() => normalizedExamples.value.length > 1 && normalizedExamples.value.every(example => !example.description))

const localPropertiesVisible = ref(props.arePropertiesInitiallyVisible)
const arePropertiesVisible = computed({
  get: () => props.propertiesExpanded ?? localPropertiesVisible.value,
  set: (expanded: boolean) => {
    localPropertiesVisible.value = expanded
    emit('update:propertiesExpanded', expanded)
  },
})
const areMemberPropertiesVisible = ref(false)
const compositionKind = computed(() => resolvedSchema.value.oneOf?.length ? 'oneOf' : resolvedSchema.value.anyOf?.length ? 'anyOf' : undefined)
const members = computed(() => compositionKind.value ? resolvedSchema.value[compositionKind.value]! : [])
const {selections, select} = useCompositionSelections()
const selectionPath = computed(() => compositionPathKey([...props.schemaPath, compositionKind.value ?? '']))
const selectedMember = computed(() => {
  const index = selections.value.get(selectionPath.value) ?? 0
  return members.value[index] ? index : 0
})
const panelId = `composition-${getCurrentInstance()!.uid}`

function isPrimitiveSchema (schema: Schema): boolean {
  const types = Array.isArray(schema.type) ? schema.type : [schema.type]
  return types.every(type => ['string', 'number', 'boolean', 'integer', 'null'].includes(type ?? ''))
}

const canHideNestedProperties = computed(() => (!props.shouldHideMainType || props.collapsible) && (!! resolvedSchema.value?.properties || typeof resolvedSchema.value.additionalProperties === 'object' || !!resolvedSchema.value.allOf?.length || (resolvedSchema.value?.items && ! isPrimitiveSchema(resolvedSchema.value?.items))))
</script>

<template>
  <ReferenceDiagnostics :issues="resolution.issues" />
  <p v-if="recursive" class="text-sm text-gray-500">Recursive schema<template v-if="schema.$ref">: <code class="break-all">{{ schema.$ref }}</code></template>.</p>
  <div v-else-if="resolution.value" class="flex flex-col gap-1.5 empty:hidden">
    <div v-if="!shouldHideMainType || compositionKind || schemaFlag(resolvedSchema, 'readOnly') || schemaFlag(resolvedSchema, 'writeOnly') || schemaFlag(resolvedSchema, 'deprecated')" class="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-base sm:text-sm">
      <div v-if="!shouldHideMainType || compositionKind" class="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
        <div v-if="propertyTitle" class="font-medium text-gray-900">{{ propertyTitle }}</div>

        <CompositionTabs v-if="compositionKind" :kind="compositionKind" :members="members" :selected="selectedMember" :panel-id="panelId" @select="select(selectionPath, $event)" />
        <div v-else class="min-w-0 text-gray-500">
          <SchemaTypePreview :schema="resolvedSchema" :original="schema" :components="components" />
        </div>
        <slot name="type-suffix" />
      </div>
      <div v-if="propertyRequired && !shouldHideMainType" class="text-amber-700">required</div>
      <span v-if="schemaFlag(resolvedSchema, 'readOnly')" class="text-gray-500">read-only</span>
      <span v-if="schemaFlag(resolvedSchema, 'writeOnly')" class="text-gray-500">write-only</span>
      <span v-if="schemaFlag(resolvedSchema, 'deprecated')" class="text-amber-700">deprecated</span>
    </div>
    <slot name="description">
      <Description v-if="resolvedSchema.description && !shouldHideDescription" class="leading-normal" :content="resolvedSchema.description" :class="propertyTitle ? 'text-gray-500' : 'text-gray-700'" />
    </slot>
    <div v-if="compositionKind && members[selectedMember]?.$ref" class="text-base text-gray-500 sm:text-sm">
      <SchemaTypePreview :schema="members[selectedMember]" :components="components" />
    </div>

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

    <div v-if="(!compositionKind || !selections.has(selectionPath)) && (resolvedSchema.default != undefined || (!shouldHideExamples && normalizedExamples.length))" class="flex flex-col gap-2">
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

    <p v-if="resolvedSchema.additionalProperties === true" class="text-sm text-gray-500 sm:text-xs">Additional properties may have any value.</p>
    <div v-if="canHideNestedProperties" class="relative z-10">
      <ToggleButton v-model:expanded="arePropertiesVisible" label="properties"/>
    </div>
    <template v-if="arePropertiesVisible">
      <div v-if="resolvedSchema.properties" :class="[
        shouldDisablePropertiesPadding ? '' : 'relative border-l pl-4',
        shouldHideMainType && !canHideNestedProperties && resolvedSchema.description && !shouldHideDescription ? 'mt-4' : '',
        'border-[color:var(--schema-border-color)]',
      ]">
        <template v-for="(propertySchema, name, i) of visibleProperties">
          <Schema
              :propertyTitle="name as string"
              :propertyRequired="(resolvedSchema.required ?? []).includes(name as string)"
              :components="components"
              :schema="propertySchema"
              :schema-path="[...schemaPath, 'properties', name as string]"
              :level="level + 1"
              :arePropertiesInitiallyVisible="level <= 0 && (! (resolvedSchema['x-hiddenProperties'] ?? []).includes(name as string))"
          />
          <div v-if="i !== Object.keys(visibleProperties).length - 1" class="h-px bg-[color:var(--schema-border-color)] my-3"></div>
        </template>
      </div>
    </template>
    <template v-if="typeof resolvedSchema.additionalProperties === 'object'">
      <div v-if="arePropertiesVisible" class="border-l border-[color:var(--schema-border-color)] pl-4">
        <Schema property-title="[key: string]" :schema="resolvedSchema.additionalProperties" :schema-path="[...schemaPath, 'additionalProperties']" :components="components" :level="level + 1" :are-properties-initially-visible="false" />
      </div>
    </template>
    <div v-if="arePropertiesVisible && resolvedSchema.allOf?.length" class="space-y-3" role="group" :aria-label="`${propertyTitle ?? 'Value'} constraints`">
      <p class="text-base text-gray-500 sm:text-sm">Must match all schemas.</p>
      <div v-for="(member, index) in resolvedSchema.allOf" :key="index" class="border-l border-[color:var(--schema-border-color)] pl-4">
        <Schema :schema="member" :schema-path="[...schemaPath, 'allOf', index]" :components="components" :level="level + 1" :are-properties-initially-visible="true" :should-hide-examples="shouldHideExamples" />
      </div>
    </div>
    <div v-if="compositionKind" :id="panelId" role="tabpanel" :aria-labelledby="`${panelId}-tab-${selectedMember}`">
      <Schema
          :key="`${compositionKind}:${selectedMember}`"
          v-model:properties-expanded="areMemberPropertiesVisible"
          :schema="members[selectedMember]"
          :schema-path="[...schemaPath, compositionKind, selectedMember]"
          :components="components"
          :level="level + 1"
          :should-hide-main-type="true"
          :should-hide-examples="shouldHideExamples"
          collapsible
      />
    </div>
    <div v-if="(arePropertiesVisible || !canHideNestedProperties) && resolvedSchema.type === 'array' && resolvedSchema.items" class="contents">
      <Schema
          :components="components"
          :schema="resolvedSchema.items"
          :schema-path="[...schemaPath, 'items']"
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
