import {Component, useCallback, useEffect, useRef, useState} from 'react'
import type {ReactNode} from 'react'
import Pages from '@/components/Layouts/Pages'
import SpecError from '@/components/SpecError'
import {fetchSpecification, parseSpecification, SpecificationError} from '@/core/openapi/specification'
import type {Document} from '@/core/openapi/types'
import type {FabricOptions} from '@/types'

class RenderingBoundary extends Component<{children: ReactNode, onRetry: () => void}, {failed: boolean}> {
  state = {failed: false}
  static getDerivedStateFromError() { return {failed: true} }
  componentDidCatch(error: unknown) { console.error('API reference rendering failed', error) }
  render() {
    if (this.state.failed) return <SpecError message="Something in this specification could not be displayed. Check the document and try again." onRetry={() => {this.setState({failed: false}); this.props.onRetry()}} />
    return this.props.children
  }
}

export default function FabricViewer({showSchemas = true, referenceLabel = true, ...options}: FabricOptions) {
  const [specification, setSpecification] = useState<Document>()
  const [documentUrl, setDocumentUrl] = useState('')
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const controller = useRef<AbortController | null>(null)
  const load = useCallback(async () => {
    controller.current?.abort()
    const current = new AbortController()
    controller.current = current
    setState('loading')
    setSpecification(undefined)
    setMessage('')
    try {
      const source = options.openApiDocument
      const result = source !== undefined
        ? {document: parseSpecification(typeof source === 'function' ? await source() : source), documentUrl: new URL(options.openApiDocumentUrl ?? window.location.href, window.location.href).href}
        : await fetchSpecification(options.openApiDocumentUrl!, current.signal)
      if (current.signal.aborted) return
      setSpecification(result.document)
      setDocumentUrl(result.documentUrl)
      setState('ready')
    } catch (error) {
      if (current.signal.aborted) return
      setMessage(error instanceof SpecificationError ? error.message : 'The specification could not be displayed. Check the document and try again.')
      setState('error')
    }
  }, [options.openApiDocument, options.openApiDocumentUrl])
  useEffect(() => {void load(); return () => controller.current?.abort()}, [load])
  if (state === 'error') return <SpecError message={message} onRetry={() => void load()} />
  if (state === 'loading') return <main className="grid min-h-dvh place-items-center px-6" role="status"><p className="text-sm text-gray-500 dark:text-gray-400">Loading API reference…</p></main>
  return <RenderingBoundary onRetry={() => void load()}>{specification && <Pages document={specification} documentUrl={documentUrl} guides={options.guides} overview={options.overview} showSchemas={showSchemas} referenceLabel={referenceLabel} logo={options.logo} />}</RenderingBoundary>
}
