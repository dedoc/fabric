import {useId, useMemo, useState} from 'react'
import {Tabs} from '@/components/UI/Tabs'
import Button from '@/components/UI/Button'
import CodePanel, {CodePanelHeader} from '@/components/UI/CodePanel'
import CodeBlock from '@/components/UI/CodeBlock'
import {CheckIcon, CopyIcon} from '@/components/Icons'
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
    <Tabs.Root value={selectedTab} onValueChange={value => setSelectedTab(value as typeof selectedTab)} render={<CodePanel className="max-h-[32rem] min-[1200px]:sticky min-[1200px]:top-8 min-[1200px]:max-h-[min(100%,calc(100dvh-64px))]" />}>
      <CodePanelHeader className="gap-2">
        <Tabs.List activateOnFocus aria-label="Schema example format" className="flex min-w-0 flex-auto items-center gap-1 overflow-x-auto [scrollbar-width:none]"><Tabs.Indicator className="hidden" />{tabs.map(tab => <Tabs.Tab key={tab.id} value={tab.id} id={`${id}-tab-${tab.id}`} aria-controls={`${id}-panel-${tab.id}`} className={`min-h-8 shrink-0 whitespace-nowrap rounded-full px-2.5 py-1.5 ${selectedTab === tab.id ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 hover:dark:text-gray-100'}`}>{tab.label}</Tabs.Tab>)}</Tabs.List>
        <Button variant="copy" disabled={!sample.code} aria-label={copied ? 'Copied schema example' : 'Copy schema example'} onClick={copy}>{copied ? <CheckIcon /> : <CopyIcon className="size-[18px]" />}</Button>
      </CodePanelHeader>
      {tabs.map(tab => <Tabs.Panel render={<CodeBlock />} key={tab.id} value={tab.id} id={`${id}-panel-${tab.id}`} aria-labelledby={`${id}-tab-${tab.id}`} tabIndex={0} className="flex-auto"><HighlightedCode code={sample.code} language={selectedTab === 'typescript' ? 'typescript' : 'json'} /></Tabs.Panel>)}
      {sample.error && <p role="note" className="px-4 pb-4 text-amber-700 dark:text-amber-400">{sample.error}</p>}<p className="sr-only" role="status">{copied ? 'Example copied.' : copyError}</p>
    </Tabs.Root>
  </aside>
}
