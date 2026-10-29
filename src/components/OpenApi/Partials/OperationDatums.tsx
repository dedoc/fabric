import {useContext, useMemo} from 'react'
import {Dialog} from '@base-ui/react/dialog'
import type {Operation} from '@/core/openapi/types'
import {DocumentContext} from '@/react/context'
import {operationSecurity, resolveSecurityScheme} from '@/core/openapi/security'
import ReferenceDiagnostics from '@/components/OpenApi/ReferenceDiagnostics'
import type {ReferenceIssue} from '@/core/openapi/references'
import SecuritySchemeDetails from '@/components/OpenApi/Partials/SecuritySchemeDetails'

export default function OperationDatums({operation}: {operation: Operation}) {
  const document = useContext(DocumentContext)
  if (!document) throw new Error('document must be provided')
  const alternatives = operationSecurity(operation, document)
  const optional = alternatives.some(group => !group.length)
  const authenticated = alternatives.filter(group => group.length)
  const issues = useMemo(() => {
    const result: ReferenceIssue[] = []
    for (const name of new Set(authenticated.flatMap(group => group.map(entry => entry.name)))) resolveSecurityScheme(name, document.components ?? {}, document, issue => result.push(issue))
    return result
  }, [authenticated, document])
  if (!authenticated.length) return null
  return <div className="text-base text-gray-500 dark:text-gray-400 sm:text-sm">
    <ReferenceDiagnostics issues={issues} />
    <Dialog.Root>
      <Dialog.Trigger className="relative inline-flex rounded-[--radius] items-center gap-1.5 py-1 underline decoration-gray-950/20 dark:decoration-gray-500 underline-offset-4 hover:text-gray-700 hover:dark:text-gray-300 hover:decoration-gray-950/40 dark:hover:decoration-gray-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500"><svg viewBox="0 0 16 16" fill="currentColor" className="size-4 shrink-0 text-gray-400 dark:text-gray-500" aria-hidden="true"><path fillRule="evenodd" d="M8 1a3.5 3.5 0 0 0-3.5 3.5V7A1.5 1.5 0 0 0 3 8.5v5A1.5 1.5 0 0 0 4.5 15h7a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 11.5 7V4.5A3.5 3.5 0 0 0 8 1Zm2 6V4.5a2 2 0 1 0-4 0V7h4Z" clipRule="evenodd" /></svg><span>{optional ? 'Auth optional' : 'Auth required'}</span><span className="absolute -inset-y-3 inset-x-0 sm:hidden" aria-hidden="true" /></Dialog.Trigger>
      <Dialog.Portal><Dialog.Backdrop className="fixed inset-0 z-50 bg-gray-950/50 dark:bg-black/60" /><Dialog.Popup aria-label="Authentication" className="fixed inset-x-0 bottom-auto top-[min(15dvh,6rem)] z-50 mx-auto my-0 max-h-[calc(100dvh-min(15dvh,6rem)-1rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-transparent dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl dark:shadow-none px-6 pb-6 pt-4 text-gray-700 dark:text-gray-300">
        <div className="flex items-center justify-between gap-4 pb-2"><Dialog.Title className="text-balance text-lg font-semibold text-gray-900 dark:text-gray-100">Authentication</Dialog.Title><Dialog.Close aria-label="Close authentication" className="grid size-11 shrink-0 place-items-center rounded-[--radius] text-gray-500 dark:text-gray-400 hover:bg-gray-950/5 hover:dark:bg-white/5 hover:text-gray-900 hover:dark:text-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gray-500"><svg viewBox="0 0 20 20" fill="none" className="size-5" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg></Dialog.Close></div>
        <div className="space-y-4">{optional && <p className="text-base sm:text-sm">Authentication is optional. You can use this endpoint without credentials, or authenticate using {authenticated.length > 1 ? 'one of the following options' : 'the method below'}.</p>}{!optional && authenticated.length > 1 && <p className="text-base sm:text-sm">Use one of the following authentication options.</p>}{authenticated.map((group, index) => <div key={index} className="space-y-3">{authenticated.length > 1 && <p className="text-base font-medium text-gray-500 dark:text-gray-400 sm:text-sm">{index ? 'Or — ' : ''}Option {index + 1}</p>}{group.length > 1 && <p className="text-base sm:text-sm">All of these methods are required together.</p>}<div className="space-y-4">{group.map(entry => <SecuritySchemeDetails key={entry.name} {...entry} />)}</div></div>)}</div>
      </Dialog.Popup></Dialog.Portal>
    </Dialog.Root>
  </div>
}
