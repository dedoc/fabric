import type {ReferenceIssue} from '@/core/openapi/references'

export default function ReferenceDiagnostics({issues}: {issues: ReferenceIssue[]}) {
  if (!issues.length) return null
  return <div className="space-y-1 rounded-md bg-amber-50 dark:bg-gray-900 p-3 text-sm text-amber-900 dark:text-amber-200" role="note" aria-label="Reference warning">
    {issues.map((issue, index) => <p key={index}>{issue.message}{issue.reference && <>: <code className="break-all">{issue.reference}</code></>}.</p>)}
  </div>
}
