import type {Components, Schema as SchemaType} from '@/core/openapi/types'
import Description from '@/components/OpenApi/Description'
import Schema from '@/components/OpenApi/Schema'
import SchemaExamples from '@/components/OpenApi/SchemaExamples'
import {resolveExampleSchema} from '@/core/openapi/schemaExamples'
import {useReferences, CompositionScopeContext, OperationSelectionsProvider} from '@/react/context'

export default function SchemaPage({name, schema, components}: {name: string; schema: SchemaType; components: Components}) {
  const references = useReferences(components)
  const resolvedSchema = resolveExampleSchema(schema, components, references.document)
  return <OperationSelectionsProvider><CompositionScopeContext.Provider value="">
    <article className="grid grid-cols-1 gap-[--sections-gap] [overflow-wrap:anywhere] min-[1200px]:min-h-[calc(100dvh-112px)] min-[1200px]:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] min-[1200px]:grid-rows-[auto_1fr]">
      <div className="flex flex-col gap-4"><h1 className="col-start-1 min-w-0 text-balance text-2xl font-medium tracking-tight md:text-3xl">{resolvedSchema?.title ?? name}</h1>{resolvedSchema?.description && <Description className="text-gray-800 dark:text-gray-200 sm:text-base" content={resolvedSchema.description} />}</div>
      <div className="col-start-1 flex min-w-0 flex-col"><Schema schema={schema} components={components} level={1} shouldHideDescription shouldHideExamples shouldHideMainType shouldDisablePropertiesPadding /></div>
      <SchemaExamples schema={schema} components={components} name={name} />
    </article>
  </CompositionScopeContext.Provider></OperationSelectionsProvider>
}
