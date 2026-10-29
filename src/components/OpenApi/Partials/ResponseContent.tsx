import {useMemo} from 'react'
import type {Components, Header, Response, Schema as SchemaType} from '@/core/openapi/types'
import {useReferences} from '@/react/context'
import ReferenceDiagnostics from '@/components/OpenApi/ReferenceDiagnostics'
import MediaType from '@/components/OpenApi/MediaType'
import Description from '@/components/OpenApi/Description'
import Schema from '@/components/OpenApi/Schema'
import {responseStatusDescription} from '@/core/openapi/responseStatus'

export default function ResponseContent({unreferencedResponse, components, statusCode, className = ''}: {unreferencedResponse: Response; components: Components; statusCode?: string; className?: string}) {
  const references = useReferences(components)
  const headers = useMemo(() => Object.entries(unreferencedResponse.headers ?? {}).map(([name, header]) => ({name, ...references.resolve<Header>(header)})), [unreferencedResponse.headers, references])
  const issues = headers.flatMap(header => header.issues)
  const headerSchema: SchemaType = {type: 'object', properties: Object.fromEntries(headers.flatMap(({name, value}) => value ? [[name, {
    description: value.description,
    ...('schema' in value ? value.schema : 'content' in value ? Object.values(value.content ?? {})[0]?.schema : {}),
  }]] : []))}
  return <div className={`space-y-5 ${className}`}>
    <ReferenceDiagnostics issues={issues} />
    {unreferencedResponse.description && unreferencedResponse.description.trim() !== responseStatusDescription(statusCode) && <Description className="-mt-2 leading-normal text-gray-700 dark:text-gray-300" content={unreferencedResponse.description} />}
    {unreferencedResponse.headers && <div><div className="flex"><div className="flex gap-2 items-baseline"><div className="font-medium text-gray-900 dark:text-gray-100 text-base">Headers</div></div></div><div className="mt-3"><Schema components={components} schema={headerSchema} direction="response" shouldHideMainType shouldDisablePropertiesPadding /></div></div>}
    <MediaType components={components} content={unreferencedResponse.content} direction="response" selectionKey={`response:${statusCode ?? 'default'}`} label="Response body content type" shouldHideExamples />
  </div>
}
