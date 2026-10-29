import {useId, useMemo, useState} from 'react'
import {Tabs} from '@base-ui/react/tabs'
import type {Components, Schema as SchemaType} from '@/core/openapi/types'
import type {ReferenceIssue} from '@/core/openapi/references'
import {createSchemaExample, resolveExampleSchema} from '@/core/openapi/schemaExamples'
import {useReferences, useCompositionSelections, useStoredChoice} from '@/react/context'
import ReferenceDiagnostics from '@/components/OpenApi/ReferenceDiagnostics'
import {selectExampleSchema} from '@/core/openapi/compositionExamples'
import {createSchemaTypescript} from '@/core/openapi/schemaTypescript'
import HighlightedCode from '@/components/OpenApi/HighlightedCode'

export default function SchemaExamples({schema, components, name}: {schema: SchemaType; components: Components; name?: string}) {
  const references = useReferences(components)
  const {selections} = useCompositionSelections()
  const schemaResolution = useMemo(() => {
    const issues: ReferenceIssue[] = []
    const selected = selectExampleSchema(schema, references.document, selections).schema
    const value = resolveExampleSchema(selected, components, references.document, issue => issues.push(issue))
    return {value, issues}
  }, [schema, components, references.document, selections])
  const tabs = [{id: 'example', label: 'Example'}, {id: 'schema', label: 'JSON schema'}, {id: 'typescript', label: 'TypeScript'}] as const
  const [selectedTab, setSelectedTab] = useStoredChoice('fabric:schema-tab', tabs.map(tab => tab.id), 'example')
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState('')
  const sample = useMemo(() => {
    try {
      if (selectedTab === 'typescript') {
        const result = createSchemaTypescript(schema, references.document, name)
        return {code: result.code, issues: result.issues, error: result.issues.length ? 'TypeScript output is unavailable until schema references are resolved.' : ''}
      }
      const value = selectedTab === 'schema' ? schema : schemaResolution.issues.length ? undefined : createSchemaExample(schemaResolution.value)
      return {code: JSON.stringify(value, null, 2) ?? '', issues: [], error: ''}
    } catch (error) { return {code: '', issues: [], error: error instanceof Error ? error.message : String(error)} }
  }, [selectedTab, schema, references.document, name, schemaResolution])
  async function copy() {
    try { await navigator.clipboard.writeText(sample.code); setCopied(true); setCopyError(''); window.setTimeout(() => setCopied(false), 2000) }
    catch { setCopyError('Unable to copy. Select and copy the code manually.') }
  }
  const id = useId()
  return <aside className="col-start-1 min-w-0 self-stretch min-[1200px]:col-start-2 min-[1200px]:row-start-2 min-[1200px]:h-0 min-[1200px]:min-h-full" aria-label="Schema examples">
    <ReferenceDiagnostics issues={selectedTab === 'typescript' ? sample.issues : schemaResolution.issues} />
    <Tabs.Root value={selectedTab} onValueChange={value => setSelectedTab(value as typeof selectedTab)} render={<section className="flex max-h-[32rem] min-h-0 flex-col overflow-hidden rounded-xl border border-[color:var(--schema-border-color)] dark:bg-[#111111] text-sm sm:text-xs min-[1200px]:sticky min-[1200px]:top-8 min-[1200px]:max-h-[min(100%,calc(100dvh-64px))]" />}>
      <div className="flex min-h-12 shrink-0 items-center gap-2 border-b border-[color:var(--schema-border-color)] px-4 py-2">
        <Tabs.List activateOnFocus aria-label="Schema example format" className="flex min-w-0 flex-auto items-center gap-1 overflow-x-auto [scrollbar-width:none]"><Tabs.Indicator className="hidden" />{tabs.map(tab => <Tabs.Tab key={tab.id} value={tab.id} id={`${id}-tab-${tab.id}`} aria-controls={`${id}-panel-${tab.id}`} className={`min-h-8 shrink-0 whitespace-nowrap rounded-full px-2.5 py-1.5 ${selectedTab === tab.id ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 hover:dark:text-gray-100'}`}>{tab.label}</Tabs.Tab>)}</Tabs.List>
        <button type="button" className="copy-button" disabled={!sample.code} aria-label={copied ? 'Copied schema example' : 'Copy schema example'} onClick={copy}>{copied ? <span>✓</span> : <svg className="size-[18px]" viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="7" y="3" width="9" height="11" rx="2" stroke="currentColor"/><path d="M12 14v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h3" stroke="currentColor"/></svg>}</button>
      </div>
      {tabs.map(tab => <Tabs.Panel render={<pre />} key={tab.id} value={tab.id} id={`${id}-panel-${tab.id}`} aria-labelledby={`${id}-tab-${tab.id}`} tabIndex={0} className="m-0 min-h-0 flex-auto overflow-auto overscroll-contain p-4 font-jetbrains-mono text-sm leading-6 text-[#435a78] dark:text-gray-300 sm:text-xs sm:leading-5 [scrollbar-width:thin] [tab-size:2] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-500"><HighlightedCode code={sample.code} language={selectedTab === 'typescript' ? 'typescript' : 'json'} /></Tabs.Panel>)}
      {sample.error && <p role="note" className="px-4 pb-4 text-amber-700 dark:text-amber-400">{sample.error}</p>}<p className="sr-only" role="status">{copied ? 'Example copied.' : copyError}</p>
    </Tabs.Root>
  </aside>
}
