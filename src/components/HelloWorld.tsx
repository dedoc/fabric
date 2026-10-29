import {useEffect, useMemo} from 'react'
import FabricViewer from '@/components/FabricViewer'
import {fetchSpecification} from '@/core/openapi/specification'
import {fabricOptions} from '@/playground/specs'

export default function HelloWorld({specUrl}: {specUrl?: string}) {
  const url = specUrl ?? fabricOptions[0].value
  const controller = useMemo(() => new AbortController(), [url])
  useEffect(() => () => controller.abort(), [controller])
  const options = useMemo(() => {
    const {value, label, ...selected} = fabricOptions.find(spec => spec.value === url) ?? {value: url, label: url, openApiDocumentUrl: url}
    return {...selected, ...(value !== selected.openApiDocumentUrl ? {openApiDocument: async () => JSON.stringify((await fetchSpecification(url, controller.signal)).document)} : {})}
  }, [url, controller])
  return <FabricViewer key={url} {...options} />
}
