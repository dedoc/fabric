import {useMemo} from 'react'
import type {Components, Parameter, Reference} from '@/core/openapi/types'
import ParameterDetails from '@/components/OpenApi/ParameterDetails'
import {useReferences} from '@/react/context'
import ReferenceDiagnostics from '@/components/OpenApi/ReferenceDiagnostics'
import SectionTitle from '@/components/OpenApi/Partials/SectionTitle'

export default function Parameters({components, parameters}: {components: Components; parameters: (Reference | Parameter)[]}) {
  const references = useReferences(components)
  const resolutions = useMemo(() => parameters.map(parameter => references.resolve<Parameter>(parameter)), [parameters, references])
  const issues = resolutions.flatMap(result => result.issues)
  const groups = resolutions.flatMap(result => result.value ? [result.value] : []).reduce<Partial<Record<Parameter['in'], Parameter[]>>>((acc, parameter) => {
    (acc[parameter.in] ??= []).push(parameter)
    return acc
  }, {})
  return <div className="space-y-[--sections-gap]">
    <ReferenceDiagnostics issues={issues} />
    {Object.entries(groups).map(([group, params]) => <div key={group}><div className="flex gap-1.5 items-baseline"><SectionTitle className="capitalize">{group} Parameters</SectionTitle></div><div className="mt-4 divide-y divide-[color:var(--schema-border-color)]">{params?.map(parameter => <ParameterDetails key={parameter.name} className="py-3 first:pt-0 last:pb-0" parameter={parameter} components={components} />)}</div></div>)}
  </div>
}
