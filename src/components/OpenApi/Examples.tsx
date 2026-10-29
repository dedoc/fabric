import {useMemo, useState} from 'react'
import type {Components, Operation, RequestBody, Response} from '@/core/openapi/types'
import {useReferences, useMediaType, useCompositionExample, useStoredChoice} from '@/react/context'
import ReferenceDiagnostics from '@/components/OpenApi/ReferenceDiagnostics'
import type {ReferenceIssue} from '@/core/openapi/references'
import MethodChip from '@/components/OpenApi/Partials/MethodChip'
import {formatMediaExample, isJsonContentType, isXmlContentType, selectMediaExample} from '@/core/openapi/mediaExamples'
import {createRequestExample, requestExampleSenders} from '@/core/openapi/requestExamples'
import Select from '@/components/UI/Select'
import Button from '@/components/UI/Button'
import CodePanel, {CodePanelHeader} from '@/components/UI/CodePanel'
import CodeBlock from '@/components/UI/CodeBlock'
import {CheckIcon, CopyIcon} from '@/components/Icons'
import Description from '@/components/OpenApi/Description'
import HighlightedCode from '@/components/OpenApi/HighlightedCode'
import {authorizationHeaderExample} from '@/core/openapi/security'

export default function Examples({base, components, path, method, operation, webhookName}: {base: string; components: Components; path: string; method: string; operation: Operation; webhookName?: string}) {
  const references = useReferences(components)
  const [requestView, setRequestView] = useState('example')
  const [preferredRequestExample, setPreferredRequestExample] = useStoredChoice('fabric:request-sender', requestExampleSenders.map(sender => sender.id), requestExampleSenders[0].id)
  const [responseView, setResponseView] = useState('example')
  const [responseStatus, setResponseStatus] = useState(Object.keys(operation.responses ?? {})[0] ?? '')
  const [copied, setCopied] = useState('')
  const [copyError, setCopyError] = useState('')
  const requestBody = references.resolve<RequestBody>(operation.requestBody)
  const {type: requestType, media: originalRequestMedia} = useMediaType(requestBody.value?.content, 'request')
  const requestMedia = useCompositionExample(originalRequestMedia, `request:${requestType}`, components)
  const requestExampleOptions = requestExampleSenders.map(({id, label}) => ({value: id, label})).concat(isJsonContentType(requestType) ? [{value: 'payload', label: 'JSON'}] : isXmlContentType(requestType) ? [{value: 'payload', label: 'XML'}] : [])
  const requestExample = requestExampleOptions.some(option => option.value === preferredRequestExample) ? preferredRequestExample : requestExampleSenders[0].id
  const responseResolution = references.resolve<Response>(operation.responses?.[responseStatus])
  const {type: responseType, media: originalResponseMedia} = useMediaType(responseResolution.value?.content, `response:${responseStatus}`)
  const responseMedia = useCompositionExample(originalResponseMedia, `response:${responseStatus}:${responseType}`, components)
  const [namedSelections, setNamedSelections] = useState<Record<string, string>>({})
  const requestKey = `request:${requestType}`
  const responseKey = `response:${responseStatus}:${responseType}`
  function namedOptions(media: typeof requestMedia) {
    return Object.entries(media?.examples ?? {}).map(([value, entry]) => ({value, label: references.resolve<{summary?: string}>(entry).value?.summary ?? value}))
  }
  const requestSample = useMemo(() => {
    try {
      const selected = selectMediaExample(requestMedia, namedSelections[requestKey], references.document)
      const model = createRequestExample(base, path, method, requestType, selected.media, components, references.document, operation.parameters ?? [])
      return {...selected, model, error: ''}
    } catch (error) { return {model: undefined, source: '', description: '', error: error instanceof Error ? error.message : String(error)} }
  }, [requestMedia, namedSelections, requestKey, references.document, base, path, method, requestType, components, operation.parameters])
  const responseSample = useMemo(() => {
    try {
      const selected = selectMediaExample(responseMedia, namedSelections[responseKey], references.document)
      return {...selected, code: formatMediaExample(selected.media, responseType, components, true, references.document, undefined, 'response'), error: ''}
    } catch (error) { return {code: '', source: '', description: '', error: error instanceof Error ? error.message : String(error)} }
  }, [responseMedia, namedSelections, responseKey, references.document, responseType, components])
  function mediaIssues(media: typeof requestMedia, type: string): ReferenceIssue[] {
    const issues: ReferenceIssue[] = []
    try { formatMediaExample(media, type, components, true, references.document, issue => issues.push(issue)) } catch { /* Sample errors are displayed separately. */ }
    return issues
  }
  const requestIssues = [...requestBody.issues, ...mediaIssues(requestMedia, requestType)]
  const responseIssues = [...responseResolution.issues, ...mediaIssues(responseMedia, responseType)]
  const format = (value: unknown) => value === undefined ? '' : JSON.stringify(value, null, 2)
  let requestCode = ''
  if (!(requestIssues.length && requestView !== 'schema')) {
    if (requestView === 'schema') requestCode = format(originalRequestMedia?.schema)
    else if (requestSample.model) {
      const request = requestSample.model
      if (requestExample === 'payload') requestCode = request.body
      else {
        const authorization = authorizationHeaderExample(operation, references.document)
        const headers = request.headers ?? []
        const sender = requestExampleSenders.find(sender => sender.id === requestExample) ?? requestExampleSenders[0]
        requestCode = sender.generate({...request, headers: authorization && !headers.some(([header]) => header.toLowerCase() === 'authorization') ? [...headers, ['Authorization', authorization]] : headers})
      }
    }
  }
  const language = (type: string) => isJsonContentType(type) ? 'json' : isXmlContentType(type) ? 'xml' : 'text'
  const requestLanguage = requestView === 'schema' ? 'json' : requestExample === 'payload' ? language(requestType) : requestExample === 'laravel' ? 'php' : 'bash'
  const responseLanguage = responseView === 'schema' ? 'json' : language(responseType)
  const responseCode = responseView === 'schema' ? format(originalResponseMedia?.schema) : responseIssues.length ? '' : responseSample.code
  async function copy(code: string, panel: string) {
    try { await navigator.clipboard.writeText(code); setCopied(panel); setCopyError(''); window.setTimeout(() => setCopied(''), 2000) }
    catch { setCopyError('Unable to copy. Select and copy the code manually.') }
  }
  return <aside className="col-start-1 min-w-0 self-stretch min-[1200px]:col-start-2 min-[1200px]:row-start-2" aria-label="Examples"><div className="flex flex-col gap-5 min-[1200px]:sticky min-[1200px]:top-8 min-[1200px]:max-h-[calc(100dvh-64px)]">
    <CodePanel className="max-h-[28rem] min-w-0 shrink-0 min-[1200px]:max-h-[40dvh]" aria-label="Request example">
      <CodePanelHeader className="flex-wrap gap-x-2 gap-y-1"><div className="flex min-w-0 flex-1 items-center gap-2"><MethodChip className="shrink-0 whitespace-nowrap" method={method} /><span className="truncate text-gray-500 dark:text-gray-400" title={webhookName ?? path}>{webhookName ?? path}</span></div>{requestView === 'schema' ? <span className="shrink-0 text-gray-600 dark:text-gray-400">JSON</span> : <Select value={requestExample} onValueChange={setPreferredRequestExample} options={requestExampleOptions} className="shrink-0 whitespace-nowrap" aria-label="Request example sender" />}<Select value={requestView} onValueChange={setRequestView} className="shrink-0 whitespace-nowrap" options={[{value: 'example', label: 'Example'}, {value: 'schema', label: 'Schema'}]} aria-label="Request example or schema" /><Button variant="copy" disabled={!requestCode} aria-label={copied === 'request' ? 'Copied request' : 'Copy request example'} onClick={() => copy(requestCode, 'request')}>{copied === 'request' ? <CheckIcon /> : <CopyIcon className="size-[18px]" />}</Button></CodePanelHeader>
      <ReferenceDiagnostics issues={requestIssues} />{requestView === 'example' && !!namedOptions(requestMedia).length && <div className="flex max-h-32 shrink-0 flex-col items-start gap-1 overflow-auto px-4 pt-2 text-gray-500 dark:text-gray-400 [scrollbar-width:thin] [&+pre]:pt-2"><Select value={namedSelections[requestKey]} onValueChange={(value: string) => setNamedSelections(previous => ({...previous, [requestKey]: value}))} options={namedOptions(requestMedia)} className="max-w-full text-gray-600 dark:text-gray-400" aria-label="Named request example" />{requestSample.description && <Description className="text-sm leading-5 text-gray-500 dark:text-gray-400 sm:text-xs" content={requestSample.description} />}</div>}
      {requestView === 'example' && requestSample.error && <p role="note" className="shrink-0 p-4 leading-5 text-amber-700 dark:text-amber-400">{requestSample.error}</p>}{requestCode ? <CodeBlock tabIndex={0}><HighlightedCode code={requestCode} language={requestLanguage} /></CodeBlock> : (requestView === 'schema' || !requestSample.error) && <p className="p-4 leading-5 text-gray-500 dark:text-gray-400">{requestView === 'schema' ? 'No schema provided.' : requestSample.model?.value === '' ? 'Empty example.' : 'No example provided.'}</p>}
    </CodePanel>
    <CodePanel className="max-h-[32rem] min-w-0 flex-auto min-[1200px]:max-h-none" aria-label="Response example">
      <CodePanelHeader className="flex-wrap gap-x-2 gap-y-1"><div className="flex min-w-0 flex-1 items-center gap-2"><span>Output</span>{responseType && <span className="min-w-0 truncate text-gray-500 dark:text-gray-400" title={responseType}>{responseType}</span>}</div>{responseStatus && <Select className="shrink-0 whitespace-nowrap" value={responseStatus} onValueChange={setResponseStatus} options={Object.keys(operation.responses ?? {}).map(value => ({value, label: value}))} aria-label="Response status" />}<Select className="shrink-0 whitespace-nowrap" value={responseView} onValueChange={setResponseView} options={[{value: 'example', label: 'Example'}, {value: 'schema', label: 'Schema'}]} aria-label="Response example or schema" /><Button variant="copy" disabled={!responseCode} aria-label={copied === 'response' ? 'Copied response' : 'Copy response example'} onClick={() => copy(responseCode, 'response')}>{copied === 'response' ? <CheckIcon /> : <CopyIcon className="size-[18px]" />}</Button></CodePanelHeader>
      <ReferenceDiagnostics issues={responseIssues} />{responseView === 'example' && !!namedOptions(responseMedia).length && <div className="flex max-h-32 shrink-0 flex-col items-start gap-1 overflow-auto px-4 pt-2 text-gray-500 dark:text-gray-400 [scrollbar-width:thin] [&+pre]:pt-2"><Select value={namedSelections[responseKey]} onValueChange={(value: string) => setNamedSelections(previous => ({...previous, [responseKey]: value}))} options={namedOptions(responseMedia)} className="max-w-full text-gray-600 dark:text-gray-400" aria-label="Named response example" />{responseSample.description && <Description className="text-sm leading-5 text-gray-500 dark:text-gray-400 sm:text-xs" content={responseSample.description} />}</div>}
      {responseView === 'example' && responseSample.error && <p role="note" className="shrink-0 p-4 leading-5 text-amber-700 dark:text-amber-400">{responseSample.error}</p>}{responseCode ? <CodeBlock tabIndex={0} className="flex-auto"><HighlightedCode code={responseCode} language={responseLanguage} /></CodeBlock> : (responseView === 'schema' || !responseSample.error) && <p className="p-4 leading-5 text-gray-500 dark:text-gray-400">{responseView === 'schema' ? 'No schema provided.' : responseSample.source === 'Supplied example' ? 'Empty example.' : 'No example provided.'}</p>}
    </CodePanel><p className="sr-only" role="status">{copied ? 'Example copied.' : copyError}</p>
  </div></aside>
}
