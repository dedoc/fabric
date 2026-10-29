import {useMemo} from 'react'
import type {Components, PathItem as PathItemType} from '@/core/openapi/types'
import {getInlineOperations} from '@/core/openapi/utils'
import {useReferences} from '@/react/context'
import ReferenceDiagnostics from '@/components/OpenApi/ReferenceDiagnostics'
import Operation from '@/components/OpenApi/Operation'
import type {ReferenceIssue} from '@/core/openapi/references'

export default function PathItem({base, components, path, pathItem}: {base: string; components: Components; path: string; pathItem: PathItemType}) {
  const references = useReferences(components)
  const resolved = useMemo(() => { const issues: ReferenceIssue[] = []; const operations = getInlineOperations({[path]: pathItem}, references.document, issue => issues.push(issue)); return {operations, issues} }, [path, pathItem, references.document])
  return <div className="space-y-40"><ReferenceDiagnostics issues={resolved.issues} />{resolved.operations.map(({operation, method}) => <div key={method}><Operation base={base} components={components} method={method} path={path} operation={operation} /></div>)}</div>
}
