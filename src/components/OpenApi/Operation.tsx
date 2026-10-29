import {useContext} from 'react'
import type {Components, Operation as OperationType} from '@/core/openapi/types'
import Request from '@/components/OpenApi/Request'
import Examples from '@/components/OpenApi/Examples'
import Description from '@/components/OpenApi/Description'
import Responses from '@/components/OpenApi/Responses'
import MethodChip from '@/components/OpenApi/Partials/MethodChip'
import OperationDatums from '@/components/OpenApi/Partials/OperationDatums'
import {OperationSelectionsProvider, DocumentContext} from '@/react/context'
import {WebhookIcon} from '@/components/Icons'
import {isNavigationTag} from '@/core/openapi/tags'
import Tag from '@/components/OpenApi/Partials/Tag'

export default function Operation({base, components, path, method, operation, webhook, webhookName}: {base: string; components: Components; path: string; method: string; operation: OperationType; webhook?: boolean; webhookName?: string}) {
  const document = useContext(DocumentContext)
  const labels = (document?.tags ?? []).filter(tag => !isNavigationTag(tag) && operation.tags?.includes(tag.name))
  const summary = operation.summary ?? operation.operationId
  return <OperationSelectionsProvider>
    <div className={`grid grid-cols-1 gap-[--sections-gap] min-[1200px]:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] ${operation.description ? 'min-[1200px]:gap-y-3' : ''}`}>
      <div className="col-start-1 min-w-0 space-y-3">
        {summary && <h1 className="text-balance text-2xl font-medium tracking-tight md:text-3xl">{summary}</h1>}
        {!!labels.length && <ul aria-label="Operation tags" className="flex flex-wrap items-center gap-2">{labels.map(tag => <li key={tag.name}><Tag tag={tag} /></li>)}</ul>}
        <div className="space-y-0.5"><div className="flex items-baseline gap-2.5 text-base"><MethodChip method={method} className="shrink-0" />{webhook ? <div className="inline-flex min-w-0 items-center gap-1.5 text-gray-900 dark:text-gray-100"><WebhookIcon className="size-4 shrink-0" /><span className="min-w-0">Webhook · {webhookName}</span></div> : <div className="min-w-0 text-gray-900 dark:text-gray-100"><span className="text-gray-500 dark:text-gray-400">{base.replace(/\/$/, '')}</span>/{path.replace(/^\//, '')}</div>}</div><OperationDatums operation={operation} /></div>
        {operation.description && <Description className="leading-normal text-gray-800 dark:text-gray-200 [&_pre]:text-xs [&_pre]:leading-4 sm:text-base min-[1200px]:hidden" content={operation.description} />}
      </div>
      <div className="col-start-1 flex min-w-0 flex-col gap-[--sections-gap]">
        {operation.description && <Description className="hidden leading-normal text-gray-800 dark:text-gray-200 [&_pre]:text-xs [&_pre]:leading-4 sm:text-base min-[1200px]:block" content={operation.description} />}
        {!!(operation.parameters?.length || operation.requestBody) && <Request components={components} parameters={operation.parameters} requestBody={operation.requestBody} />}
        {operation.responses && <Responses responses={operation.responses} components={components} />}
      </div>
      <Examples base={base} components={components} path={path} method={method} operation={operation} webhookName={webhookName} />
    </div>
  </OperationSelectionsProvider>
}
