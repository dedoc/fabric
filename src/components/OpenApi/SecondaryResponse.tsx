import {useMemo} from 'react'
import type {Components, Reference, Response as ResponseType} from '@/core/openapi/types'
import {useReferences} from '@/react/context'
import ReferenceDiagnostics from '@/components/OpenApi/ReferenceDiagnostics'
import ResponseHeader from '@/components/OpenApi/Partials/ResponseHeader'
import Description from '@/components/OpenApi/Description'
import MediaType from '@/components/OpenApi/MediaType'
import {responseStatusDescription} from '@/core/openapi/responseStatus'

export default function SecondaryResponse({components, statusCode, response}: {components: Components; statusCode: number; response: ResponseType | Reference}) {
  const references = useReferences(components)
  const resolution = useMemo(() => references.resolve<ResponseType>(response), [references, response])
  const body = resolution.value
  return <><ReferenceDiagnostics issues={resolution.issues} />{body && <div><ResponseHeader statusCode={String(statusCode)} />{body.description && body.description.trim() !== responseStatusDescription(String(statusCode)) && <Description className="text-gray-700 dark:text-gray-300 mt-4 leading-normal text-sm" content={body.description} />}<MediaType className="mt-5" components={components} content={body.content} direction="response" selectionKey={`response:${statusCode}`} label="Response body content type" shouldHideExamples /></div>}</>
}
