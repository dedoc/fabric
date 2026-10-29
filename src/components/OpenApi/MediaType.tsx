import {useMemo} from 'react'
import type {ReactNode} from 'react'
import type {Components, MediaType as MediaTypeType} from '@/core/openapi/types'
import Schema from '@/components/OpenApi/Schema'
import SchemaTypePreview from '@/components/OpenApi/SchemaTypePreview'
import {getSchemaTypePreview} from '@/core/openapi/utils'
import Select from '@/components/UI/Select'
import {useMediaType, useReferences, CompositionScopeContext} from '@/react/context'
import ValueExamples from '@/components/OpenApi/ValueExamples'
import type {SchemaDirection} from '@/core/openapi/schemaUsage'
import Description from '@/components/OpenApi/Description'
import {schemaDisplay} from '@/core/openapi/schemaDisplay'

export default function MediaType({components, content, label, selectionKey, showExamples, shouldHideExamples, direction, title, typeSuffix, description, children, className = ''}: {
  components: Components; content?: Record<string, MediaTypeType>; label?: string; selectionKey?: string; showExamples?: boolean; shouldHideExamples?: boolean; direction?: SchemaDirection
  title?: ReactNode; typeSuffix?: ReactNode; description?: ReactNode; children?: ReactNode; className?: string
}) {
  const {types, type, setType, media} = useMediaType(content, selectionKey ?? '')
  const references = useReferences(components)
  const bodyDescriptions = useMemo(() => {
    if (!media?.schema) return []
    const {layers} = schemaDisplay(media.schema, references.document)
    const ownDescription = layers[0]?.schema.description
    return ownDescription !== undefined ? [ownDescription] : layers.flatMap(layer => layer.schema.description ? [layer.schema.description] : [])
  }, [media, references.document])
  const hasBodyDescription = !!description || bodyDescriptions.some(Boolean)
  const preview = media?.schema?.oneOf?.length || media?.schema?.anyOf?.length ? undefined : getSchemaTypePreview(media?.schema)
  const scope = `${selectionKey ?? ''}:${type}`
  return <CompositionScopeContext.Provider value={scope}><div className={className}>{media && <>
    <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-2 gap-y-1 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
      <div className="col-start-1 row-start-1">{title ?? <div className="font-medium text-gray-900 dark:text-gray-100 text-base">Body</div>}</div>
      {(preview || typeSuffix) && <div className="col-span-2 col-start-1 row-start-2 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 break-words text-base font-normal text-gray-500 dark:text-gray-400 sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:text-sm">{preview && <SchemaTypePreview schema={media.schema} components={components} />}{typeSuffix}</div>}
      <Select value={type} onValueChange={setType} options={types.map(value => ({value, label: value}))} className="col-start-2 row-start-1 max-w-full justify-self-end text-base font-normal text-gray-500 dark:text-gray-400 sm:col-start-3 sm:text-sm" aria-label={label ?? 'Body content type'} title={type} />
    </div>
    {hasBodyDescription && <div className="mt-1">{description ?? bodyDescriptions.map((text, index) => <Description key={index} className="leading-normal text-gray-700 dark:text-gray-300" content={text} />)}</div>}
    {media.schema && <div key={type} className={hasBodyDescription ? 'mt-6' : 'mt-4'}><Schema components={components} schema={media.schema} direction={direction} shouldHideDescription={hasBodyDescription} shouldHideExamples={shouldHideExamples || !!(showExamples && (media.example !== undefined || Object.keys(media.examples ?? {}).length))} shouldHideMainType shouldDisablePropertiesPadding /></div>}
    {showExamples && <ValueExamples className="mt-3" example={media.example} examples={media.examples} components={components} schema={media.schema} direction={direction} />}
  </>}</div>{children}</CompositionScopeContext.Provider>
}
