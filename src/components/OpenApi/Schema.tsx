import {useContext, useId, useMemo, useState, type ReactNode} from 'react'
import type {Components, Schema as SchemaType} from '@/core/openapi/types'
import SchemaAttribute from '@/components/OpenApi/SchemaAttribute'
import SchemaConstraints from '@/components/OpenApi/SchemaConstraints'
import SchemaTypePreview from '@/components/OpenApi/SchemaTypePreview'
import ReferenceDiagnostics from '@/components/OpenApi/ReferenceDiagnostics'
import Description from '@/components/OpenApi/Description'
import ToggleButton from '@/components/OpenApi/Partials/ToggleButton'
import CompositionTabs from '@/components/OpenApi/CompositionTabs'
import {useReferences, useCompositionSelections, SchemaDirectionContext, SchemaAncestorsContext} from '@/react/context'
import {schemaFlag, isSchemaVisible, directionalExample, type SchemaDirection} from '@/core/openapi/schemaUsage'
import {resolveExampleSchema} from '@/core/openapi/schemaExamples'
import {compositionPathKey, type SchemaPath} from '@/core/openapi/compositionExamples'
import {schemaDisplay} from '@/core/openapi/schemaDisplay'

type Props = {
  shouldHideMainType?: boolean
  shouldHideDescription?: boolean
  shouldHideExamples?: boolean
  shouldDisablePropertiesPadding?: boolean
  propertyTitle?: string
  propertyRequired?: boolean
  components: Components
  schema: SchemaType
  arePropertiesInitiallyVisible?: boolean
  propertiesExpanded?: boolean
  onPropertiesExpandedChange?: (expanded: boolean) => void
  collapsible?: boolean
  level?: number
  direction?: SchemaDirection
  schemaPath?: SchemaPath
  allOfPaths?: SchemaPath[]
  typeSuffix?: ReactNode
  description?: ReactNode
  className?: string
}

export default function Schema({
  shouldHideMainType = false,
  shouldHideDescription = false,
  shouldHideExamples = false,
  shouldDisablePropertiesPadding = false,
  propertyTitle,
  propertyRequired = false,
  components,
  schema,
  arePropertiesInitiallyVisible = true,
  propertiesExpanded,
  onPropertiesExpandedChange,
  collapsible = false,
  level = 1,
  direction: explicitDirection,
  schemaPath = [],
  allOfPaths,
  typeSuffix,
  description,
  className,
}: Props) {
  const references = useReferences(components)
  const inheritedDirection = useContext(SchemaDirectionContext)
  const direction = explicitDirection ?? inheritedDirection
  const parentAncestors = useContext(SchemaAncestorsContext)
  const resolution = references.resolve<SchemaType>(schema, 'schema')
  const resolvedSchema: SchemaType = resolution.value ?? {}
  const display = schemaDisplay(schema, references.document, schemaPath, allOfPaths)
  const arrayTypeSchema = display.layers.find(layer => layer.schema.type === 'array')?.schema
  const visibleProperties = [...display.properties].filter(([, field]) => {
    const resolved = resolveExampleSchema(field.schema, components, references.document)
    return !resolved || isSchemaVisible(resolved, direction)
  })
  const recursive = parentAncestors.has(schema) || display.layers.some(layer => parentAncestors.has(layer.schema))
  const nextAncestors = useMemo(() => {
    const next = new Set(parentAncestors).add(schema)
    for (const layer of display.layers) next.add(layer.schema)
    return next
  }, [parentAncestors, schema, display.layers])

  function examplesFor(source: SchemaType) {
    const examples = [
      ...(typeof source.example !== 'undefined' ? [source.example] : []),
      ...(source.examples ?? []),
    ].map(example => typeof example === 'object' && example !== null && 'value' in example ? example : {value: example})
    const exampleSchema = direction === 'neutral' ? undefined : resolveExampleSchema(schema, components, references.document)
    return examples.map(example => ({...example, value: directionalExample(example.value, exampleSchema, direction)}))
  }

  const normalizedExamples = examplesFor(resolvedSchema)
  function displayFlag(flag: 'readOnly' | 'writeOnly' | 'deprecated') {
    return display.layers.some(layer => schemaFlag(layer.schema, flag))
  }
  const canGroupExamples = normalizedExamples.length > 1 && normalizedExamples.every(example => !example.description)
  const [localPropertiesVisible, setLocalPropertiesVisible] = useState(arePropertiesInitiallyVisible)
  const arePropertiesVisible = propertiesExpanded ?? localPropertiesVisible
  function setPropertiesVisible(expanded: boolean) {
    setLocalPropertiesVisible(expanded)
    onPropertiesExpandedChange?.(expanded)
  }
  const [areMemberPropertiesVisible, setAreMemberPropertiesVisible] = useState(false)
  const compositionKind = resolvedSchema.oneOf?.length ? 'oneOf' : resolvedSchema.anyOf?.length ? 'anyOf' : undefined
  const members = compositionKind ? resolvedSchema[compositionKind] ?? [] : []
  const {selections, select} = useCompositionSelections()
  const selectionPath = compositionPathKey([...schemaPath, compositionKind ?? ''])
  const selectedMemberCandidate = selections.get(selectionPath) ?? 0
  const selectedMember = members[selectedMemberCandidate] ? selectedMemberCandidate : 0
  const panelId = `composition-${useId().replaceAll(':', '')}`

  function isPrimitiveSchema(value: SchemaType): boolean {
    const types = Array.isArray(value.type) ? value.type : [value.type]
    return types.every(type => ['string', 'number', 'boolean', 'integer', 'null'].includes(type ?? ''))
  }
  const canHideNestedProperties = !recursive && (!shouldHideMainType || collapsible) && (display.properties.size > 0 || !!display.additionalProperties || (display.items && !isPrimitiveSchema(display.items.schema)))

  return <SchemaAncestorsContext.Provider value={nextAncestors}>
    <SchemaDirectionContext.Provider value={direction}>
      <ReferenceDiagnostics issues={display.issues} />
      {resolution.value && <div className={['flex flex-col gap-1 empty:hidden', className].filter(Boolean).join(' ')}>
        {(!shouldHideMainType || arrayTypeSchema || compositionKind || displayFlag('readOnly') || displayFlag('writeOnly') || displayFlag('deprecated')) && <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-base sm:text-sm">
          {(!shouldHideMainType || arrayTypeSchema || compositionKind) && <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
            {propertyTitle && <div className="font-medium text-gray-900 dark:text-gray-100">{propertyTitle}</div>}
            {compositionKind
              ? <CompositionTabs kind={compositionKind} members={members} selected={selectedMember} panelId={panelId} onSelect={index => select(selectionPath, index)} />
              : <div className="min-w-0 text-gray-500 dark:text-gray-400"><SchemaTypePreview schema={shouldHideMainType && arrayTypeSchema ? arrayTypeSchema : resolvedSchema} original={shouldHideMainType && arrayTypeSchema ? undefined : schema} components={components} /></div>}
            {typeSuffix}
          </div>}
          {propertyRequired && !shouldHideMainType && <div className="text-amber-700 dark:text-amber-400">required</div>}
          {displayFlag('readOnly') && <span className="text-gray-500 dark:text-gray-400">read-only</span>}
          {displayFlag('writeOnly') && <span className="text-gray-500 dark:text-gray-400">write-only</span>}
          {displayFlag('deprecated') && <span className="text-amber-700 dark:text-amber-400">deprecated</span>}
        </div>}
        {description ?? (resolvedSchema.description && !shouldHideDescription && <Description className={`leading-normal ${propertyTitle ? 'text-gray-500 dark:text-gray-400' : 'text-gray-700 dark:text-gray-300'}`} content={resolvedSchema.description} />)}
        {compositionKind && members[selectedMember]?.$ref && <div className="text-base text-gray-500 dark:text-gray-400 sm:text-sm"><SchemaTypePreview schema={members[selectedMember]} components={components} /></div>}

        <SchemaConstraints schema={resolvedSchema} />
        {display.layers.slice(1).map((layer, index) => <div key={index}>
          {resolvedSchema.description === undefined && layer.schema.description && !shouldHideDescription && <Description className={`leading-normal ${propertyTitle ? 'text-gray-500 dark:text-gray-400' : 'text-gray-700 dark:text-gray-300'}`} content={layer.schema.description} />}
          <SchemaConstraints schema={layer.schema} />
          {layer.schema.enum?.length ? <SchemaAttribute title="Enum" value={layer.schema.enum} /> : null}
          {layer.schema.const !== undefined && <SchemaAttribute title="Const" value={layer.schema.const} />}
          {layer.schema.default !== undefined && <SchemaAttribute title="Default" value={layer.schema.default} />}
          {!shouldHideExamples && examplesFor(layer.schema).map((example, exampleIndex) => <SchemaAttribute key={exampleIndex} title="Example" value={example.value} description={example.description} />)}
          {!recursive && (layer.schema.oneOf?.length || layer.schema.anyOf?.length) ? <Schema schema={{oneOf: layer.schema.oneOf, anyOf: layer.schema.anyOf}} schemaPath={layer.path} components={components} level={level} shouldHideMainType shouldHideExamples={shouldHideExamples} /> : null}
        </div>)}
        {display.recursive.length > 0 && <p className="text-sm text-gray-500 dark:text-gray-400">Recursive schema.</p>}

        {(!compositionKind || !selections.has(selectionPath)) && (resolvedSchema.default != undefined || (!shouldHideExamples && normalizedExamples.length > 0)) && <div className="flex flex-col gap-1">
          {resolvedSchema.default != undefined && <SchemaAttribute title="Default" value={resolvedSchema.default === '' ? "''" : resolvedSchema.default} />}
          {!shouldHideExamples && canGroupExamples
            ? <SchemaAttribute title="Examples" value={normalizedExamples.map(example => example.value)} />
            : !shouldHideExamples && normalizedExamples.map((example, index) => <SchemaAttribute key={index} title="Example" value={example.value} description={example.description} />)}
        </div>}
        {resolvedSchema.const !== undefined && <SchemaAttribute title="Const" value={resolvedSchema.const} />}
        {resolvedSchema.enum != undefined && resolvedSchema.enum.length > 0 && <div className="flex flex-col gap-2"><SchemaAttribute title="Enum" value={resolvedSchema.enum} /></div>}

        {canHideNestedProperties && <div><ToggleButton expanded={arePropertiesVisible} onExpandedChange={setPropertiesVisible} label="properties" className={arePropertiesVisible ? 'mb-1' : undefined} /></div>}
        {!recursive && arePropertiesVisible && display.properties.size > 0 && <div className={`${shouldDisablePropertiesPadding ? '' : 'relative border-l pl-4'} ${shouldHideMainType && !canHideNestedProperties && display.layers.some(layer => layer.schema.description) && !shouldHideDescription ? 'mt-1' : ''} border-[color:var(--schema-border-color)]`}>
          {visibleProperties.map(([name, field], index) => <div key={name}>
            <Schema propertyTitle={name} propertyRequired={display.required.has(name)} components={components} schema={field.schema} schemaPath={field.path} allOfPaths={field.allOfPaths} shouldHideExamples={shouldHideExamples} level={level + 1} arePropertiesInitiallyVisible={level <= 0 && !(resolvedSchema['x-hiddenProperties'] ?? []).includes(name)} />
            {index !== visibleProperties.length - 1 && <div className="h-px bg-[color:var(--schema-border-color)] my-3" />}
          </div>)}
        </div>}
        {!recursive && arePropertiesVisible && display.additionalProperties && <div className="border-l border-[color:var(--schema-border-color)] pl-4">
          {visibleProperties.length > 0 && <div className="h-px bg-[color:var(--schema-border-color)] my-3" />}
          <Schema propertyTitle="[key: string]" schema={display.additionalProperties.schema} schemaPath={display.additionalProperties.path} allOfPaths={display.additionalProperties.allOfPaths} components={components} level={level + 1} arePropertiesInitiallyVisible={false} shouldHideExamples={shouldHideExamples} />
        </div>}
        {!recursive && compositionKind && <div id={panelId} role="tabpanel" aria-labelledby={`${panelId}-tab-${selectedMember}`}>
          <Schema key={`${compositionKind}:${selectedMember}`} propertiesExpanded={areMemberPropertiesVisible} onPropertiesExpandedChange={setAreMemberPropertiesVisible} schema={members[selectedMember]} schemaPath={[...schemaPath, compositionKind, selectedMember]} components={components} level={level + 1} shouldHideMainType shouldHideExamples={shouldHideExamples} collapsible />
        </div>}
        {!recursive && (arePropertiesVisible || !canHideNestedProperties) && display.items && <div className="contents">
          <Schema components={components} schema={display.items.schema} schemaPath={display.items.path} allOfPaths={display.items.allOfPaths} shouldHideMainType shouldHideExamples={shouldHideExamples} level={level + 1} />
        </div>}
      </div>}
    </SchemaDirectionContext.Provider>
  </SchemaAncestorsContext.Provider>
}
