import {useMemo} from 'react'
import type {Components, RequestBody as RequestBodyType, Reference} from '@/core/openapi/types'
import {useReferences} from '@/react/context'
import ReferenceDiagnostics from '@/components/OpenApi/ReferenceDiagnostics'
import MediaType from '@/components/OpenApi/MediaType'
import SectionTitle from '@/components/OpenApi/Partials/SectionTitle'
import Description from '@/components/OpenApi/Description'

export default function RequestBody({components, requestBody}: {components: Components; requestBody: RequestBodyType | Reference}) {
  const references = useReferences(components)
  const resolution = useMemo(() => references.resolve<RequestBodyType>(requestBody), [references, requestBody])
  const body = resolution.value
  const hasContent = Object.keys(body?.content ?? {}).length > 0
  return <><ReferenceDiagnostics issues={resolution.issues} />{body && <section className="space-y-4" aria-label="Request body">
    {hasContent ? <MediaType components={components} content={body.content} direction="request" selectionKey="request" label="Request body content type" shouldHideExamples
      title={<SectionTitle>Request Body</SectionTitle>}
      typeSuffix={body.required ? <span className="text-sm text-amber-700 dark:text-amber-400">required</span> : undefined}
      description={body.description !== undefined ? <Description className="text-base leading-normal text-gray-700 dark:text-gray-300 sm:text-sm" content={body.description} /> : undefined} />
      : <><div className="flex flex-wrap items-baseline gap-2"><SectionTitle>Request Body</SectionTitle>{body.required && <span className="text-sm text-amber-700 dark:text-amber-400">required</span>}</div>{body.description && <Description className="text-base leading-normal text-gray-700 dark:text-gray-300 sm:text-sm" content={body.description} />}</>}
  </section>}</>
}
