<script setup lang="ts">
import type {Components, Schema} from "./types.ts";
import {computed, ref} from "vue";
import SchemaAttribute from "./SchemaAttribute.vue";
import {getSchemaTypePreview} from "./utils.ts";
import Description from "./Description.vue";
import ToggleButton from "./Partials/ToggleButton.vue";

const props = withDefaults(defineProps<{
  shouldHideMainType?: boolean, // used to hide top type for schemas
  shouldDisablePropertiesPadding?: boolean, // used to make properties not padded from left for top level objects
  propertyTitle?: string, // when schema is rendered for object property
  propertyRequired?: boolean, // when schema is rendered for object property
  components: Components,
  schema: Schema,
  arePropertiesInitiallyVisible?: boolean,
  level: number,
}>(), {
  arePropertiesInitiallyVisible: true,
  level: 1,
})

function resolveSchema (schema: Schema): Schema|undefined {
  if (! schema.$ref) {
    return schema
  }
  const path = schema.$ref.split('/').slice(2)
  let result = props.components
  path.forEach((pathItem) => {
    if (! result) {
      return
    }
    result = result[pathItem]
  })
  if (! result.$ref && ! result.type && ! result.allOf) {
    return undefined
  }
  return result as Schema
}

function mergeAllOffSchemas (schema: Schema): Schema {
  if (! schema.allOf) {
    return schema
  }

  const unreferencedSchemas = schema.allOf.map(resolveSchema)

  return mergeAllOffSchemas(unreferencedSchemas.slice(1).reduce((acc, schema) => {
    return {
      ...acc,
      ...(acc?.required || schema?.required ? { required: (acc?.required ?? []).concat(schema?.required ?? []) } : {}),
      ...(acc?.properties || schema?.properties ? { properties: { ...(acc?.properties ?? {}), ...(schema?.properties ?? {}) } } : {}),
    }
  }, { ...(unreferencedSchemas[0])  }))
}

// will work only for components references
const resolvedSchema = computed(() => {
  let unreferencedSchema = resolveSchema(props.schema)
  if (! unreferencedSchema) {
    console.error({ schema: props.schema })
    throw new Error('Cannot unreference schema')
  }
  return mergeReferencedAndResolvedSchemas(props.schema, mergeAllOffSchemas(unreferencedSchema))
})

function mergeReferencedAndResolvedSchemas (possiblyReferencedSchema: Schema, unreferencedSchema: Schema) {
  if (! possiblyReferencedSchema.$ref) {
    return unreferencedSchema
  }
  const { $ref, ...overrides } = possiblyReferencedSchema
  return {
    ...unreferencedSchema,
    ...overrides
  }
}

const normalizedExamples = computed(() => {
  const examples = [
      ...([resolvedSchema.value?.example].filter(e => typeof e !== 'undefined') as any[]),
      ...(resolvedSchema.value?.examples ?? []),
  ]
  const res = examples.map(example => {
    return typeof example === 'object' && example !== null && ('value' in example) ? example : {value: example}
  }) ?? []

  console.log({res})

  return res
})

const arePropertiesVisible = ref(props.arePropertiesInitiallyVisible)

function isPrimitiveSchema (schema: Schema): boolean {
  return schema.type === 'string' || schema.type === 'number' || schema.type === 'boolean' || schema.type === 'integer'
}

const canHideNestedProperties = computed(() => ! props.shouldHideMainType && (!! resolvedSchema.value?.properties || (resolvedSchema.value?.items && ! isPrimitiveSchema(resolvedSchema.value?.items))))
</script>

<template>
  <div v-if="resolvedSchema" class="flex flex-col gap-1.5">
<!--    <pre class="text-xs">{{resolvedSchema}}</pre>-->
<!--    <pre class="text-xs">{{schema}}</pre>-->
    <div v-if="!shouldHideMainType" class="flex items-baseline gap-2">
      <div class="flex items-baseline gap-2">
        <div v-if="propertyTitle" class="text-sm font-medium text-gray-900">{{ propertyTitle }}</div>

        <div class="text-[#8A8A8A] text-sm">
          {{ getSchemaTypePreview(resolvedSchema, schema) }}
          {{ (schema.anyOf ?? []).map(s => getSchemaTypePreview(s)).join(' | ') }}
        </div>
      </div>
      <div v-if="propertyRequired" class="text-sm text-orange-400">required</div>
    </div>
    <Description v-if="resolvedSchema.description" class="text-gray-700 leading-5 prose-sm" :content="resolvedSchema.description"/>

    <div v-if="
      resolvedSchema.minLength !== undefined
      || resolvedSchema.maxLength !== undefined
      || resolvedSchema.minimum !== undefined
      || resolvedSchema.maximum !== undefined
    " class="flex gap-1">
      <div v-if="resolvedSchema.minLength !== undefined" class="text-gray-600 bg-gray-100 rounded-md leading-[15px] text-xs px-[3px] py-0.5"><span class="common-ligatures">{{ '>='}}</span> {{ resolvedSchema.minLength }} characters</div>
      <div v-if="resolvedSchema.maxLength !== undefined" class="text-gray-600 bg-gray-100 rounded-md leading-[15px] text-xs px-[3px] py-0.5"><span class="common-ligatures">{{ '<='}}</span> {{ resolvedSchema.maxLength }} characters</div>
      <div v-if="resolvedSchema.minimum !== undefined" class="text-gray-600 bg-gray-100 rounded-md leading-[15px] text-xs px-[3px] py-0.5"><span class="common-ligatures">{{ '>='}}</span> {{ resolvedSchema.minimum }}</div>
      <div v-if="resolvedSchema.maximum !== undefined" class="text-gray-600 bg-gray-100 rounded-md leading-[15px] text-xs px-[3px] py-0.5"><span class="common-ligatures">{{ '<='}}</span> {{ resolvedSchema.maximum }}</div>
    </div>

    <div v-if="resolvedSchema.default != undefined || normalizedExamples.length" class="flex flex-col gap-2">
      <SchemaAttribute
          v-if="resolvedSchema.default != undefined"
          title="Default"
          :value="resolvedSchema.default === '' ? '\'\'' : resolvedSchema.default"
      />
      <SchemaAttribute
          v-for="example of normalizedExamples"
          title="Example"
          :value="example.value"
          :description="example.description"
      />
    </div>

    <div v-if="resolvedSchema.enum != undefined && resolvedSchema.enum.length" class="flex flex-col gap-2">
      <SchemaAttribute
          title="Enum"
          :value="resolvedSchema.enum"
      />
    </div>

    <div v-if="canHideNestedProperties" class="relative z-10">
      <ToggleButton v-model:expanded="arePropertiesVisible" label="properties"/>
    </div>
    <template v-if="arePropertiesVisible">
      <div v-if="resolvedSchema.properties" :class="[shouldDisablePropertiesPadding ? '' : 'border-l pl-4','border-gray-100 -mt-8 pt-8']">
        <template v-for="(propertySchema, name, i) of resolvedSchema.properties">
          <Schema
              :propertyTitle="name as string"
              :propertyRequired="(resolvedSchema.required ?? []).includes(name as string)"
              :components="components"
              :schema="propertySchema"
              :level="level + 1"
              :arePropertiesInitiallyVisible="level <= 0 && (! (resolvedSchema['x-hiddenProperties'] ?? []).includes(name))"
          />
          <div v-if="i !== Object.keys(resolvedSchema.properties).length - 1" class="h-px bg-gray-100 my-3"></div>
        </template>
      </div>
    </template>
    <div v-if="(arePropertiesVisible || !canHideNestedProperties) && resolvedSchema.type === 'array' && resolvedSchema.items">
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
