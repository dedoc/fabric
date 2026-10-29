import type {Components, Example, Reference, Schema} from '@/core/openapi/types'
import type {SchemaDirection} from '@/core/openapi/schemaUsage'
import Description from '@/components/OpenApi/Description'
import SchemaAttribute from '@/components/OpenApi/SchemaAttribute'
import ReferenceDiagnostics from '@/components/OpenApi/ReferenceDiagnostics'
import {useReferences} from '@/react/context'
import {resolveExampleSchema} from '@/core/openapi/schemaExamples'
import {directionalExample} from '@/core/openapi/schemaUsage'

export default function ValueExamples({example, examples, components, schema, direction, className}: {example?: unknown, examples?: Record<string, Example|Reference>, components: Components, schema?: Schema, direction?: SchemaDirection, className?: string}) {
  const references = useReferences(components)
  const resolvedSchema = direction ? resolveExampleSchema(schema, components, references.document) : undefined
  const displayedExample = directionalExample(example, resolvedSchema, direction ?? 'neutral')
  const named = Object.entries(examples ?? {}).map(([name, entry]) => {
    const result = references.resolve<Example>(entry)
    return {name, ...result, value: result.value ? {...result.value, value: directionalExample(result.value.value, resolvedSchema, direction ?? 'neutral')} : undefined}
  })
  const issues = named.flatMap(result => result.issues)

  if (example === undefined && !named.length) return null
  return <div className={['space-y-1', className].filter(Boolean).join(' ')}>
    <ReferenceDiagnostics issues={issues} />
    {example !== undefined
      ? <SchemaAttribute title="Example" value={displayedExample} />
      : named.map((entry, index) => entry.value ? <div key={entry.name}>
        {entry.value.value !== undefined || entry.value.externalValue
          ? <SchemaAttribute title={index === 0 ? (named.length > 1 ? 'Examples' : 'Example') : ''} value={entry.value.value !== undefined ? entry.value.value : entry.value.externalValue}>
            <div className="inline text-sm leading-normal text-gray-500 dark:text-gray-400 sm:text-xs">
              <strong className="ml-1 font-medium">{entry.value.summary ?? entry.name}</strong>
              {entry.value.description && <><span aria-hidden="true"> · </span><Description className="inline text-sm leading-normal text-gray-500 dark:text-gray-400 sm:text-xs [&>p]:inline" content={entry.value.description} /></>}
            </div>
          </SchemaAttribute>
          : <>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 sm:text-xs">{entry.value.summary ?? entry.name}</p>
            {entry.value.description && <Description className="text-sm leading-normal text-gray-500 dark:text-gray-400 sm:text-xs" content={entry.value.description} />}
          </>}
      </div> : null)}
  </div>
}
