import {useMemo, useState} from 'react'
import type {Components, Reference, Response as ResponseType} from '@/core/openapi/types'
import {useReferences} from '@/react/context'
import ReferenceDiagnostics from '@/components/OpenApi/ReferenceDiagnostics'
import ResponseHeader from '@/components/OpenApi/Partials/ResponseHeader'
import ResponseContent from '@/components/OpenApi/Partials/ResponseContent'
import ToggleButton from '@/components/OpenApi/Partials/ToggleButton'

export default function Response({components, statusCode, response, secondary}: {components: Components; statusCode: string | number; response: ResponseType | Reference; secondary?: boolean}) {
  const references = useReferences(components)
  const resolution = useMemo(() => references.resolve<ResponseType>(response), [references, response])
  const [expanded, setExpanded] = useState(!secondary)
  return <><ReferenceDiagnostics issues={resolution.issues} />{resolution.value && <div><ResponseHeader className="min-w-0" statusCode={String(statusCode)}>{secondary && <ToggleButton className="ml-auto shrink-0" expanded={expanded} onExpandedChange={setExpanded} label="body" />}</ResponseHeader>{expanded && <ResponseContent className="mt-4" unreferencedResponse={resolution.value} statusCode={String(statusCode)} components={components} />}</div>}</>
}
