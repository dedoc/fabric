import type {Components, Parameter} from '@/core/openapi/types'
import Schema from '@/components/OpenApi/Schema'
import Description from '@/components/OpenApi/Description'
import ValueExamples from '@/components/OpenApi/ValueExamples'
import {CompositionScopeContext} from '@/react/context'

export default function ParameterDetails({parameter, components, className = ''}: {parameter: Parameter; components: Components; className?: string}) {
  const contentEntry = Object.entries(parameter.content ?? {})[0]
  const contentMedia = contentEntry?.[1]
  const hasExamples = parameter.example !== undefined || Object.keys(parameter.examples ?? {}).length > 0
  const contentHasExamples = contentMedia?.example !== undefined || Object.keys(contentMedia?.examples ?? {}).length > 0
  const schema = parameter.schema ?? contentMedia?.schema
  return <CompositionScopeContext.Provider value={`parameter:${parameter.in}:${parameter.name}`}>
    <div className={`min-w-0 space-y-1 ${className}`} aria-label={`${parameter.in} parameter ${parameter.name}`}>
      {schema ? <Schema schema={schema} components={components} direction="request" propertyTitle={parameter.name} propertyRequired={parameter.required} arePropertiesInitiallyVisible={false} shouldHideExamples={hasExamples || contentHasExamples}
        typeSuffix={contentEntry ? <span className="text-gray-500 dark:text-gray-400">{contentEntry[0]}</span> : undefined}
        description={parameter.description !== undefined ? <Description className="text-base leading-normal text-gray-500 dark:text-gray-400 sm:text-sm" content={parameter.description} /> : undefined} />
        : <><div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-base sm:text-sm"><span className="font-medium text-gray-900 dark:text-gray-100">{parameter.name}</span>{contentEntry && <span className="text-gray-500 dark:text-gray-400">{contentEntry[0]}</span>}{parameter.required && <span className="text-amber-700 dark:text-amber-400">required</span>}</div>{parameter.description && <Description className="text-base leading-normal text-gray-500 dark:text-gray-400 sm:text-sm" content={parameter.description} />}</>}
      {contentMedia && !hasExamples && <ValueExamples example={contentMedia.example} examples={contentMedia.examples} components={components} schema={schema} direction="request" />}
      <ValueExamples example={parameter.example} examples={parameter.examples} components={components} schema={schema} direction="request" />
    </div>
  </CompositionScopeContext.Provider>
}
