import {useEffect, useMemo, useState} from 'react'
import {setTheme} from '@/utils/theme'
import {fabricOptions, galaxySpecUrl} from '@/playground/specs'
import Select from '@/components/UI/Select'

const renderers = [
  {value: 'fabric', label: 'Fabric'}, {value: 'elements', label: 'Stoplight Elements'},
  {value: 'redoc', label: 'Redoc 2.5.2'}, {value: 'redoc3', label: 'Redoc 3.0.0-rc.0'},
  {value: 'swagger', label: 'Swagger UI'}, {value: 'scalar', label: 'Scalar'},
  {value: 'rapidoc', label: 'RapiDoc'}, {value: 'explorer', label: 'OpenAPI Explorer'},
]

export default function ComparisonCanvas() {
  const initial = useMemo(() => {
    const query = new URLSearchParams(window.location.search)
    const requested = query.get('spec')
    const selected = requested === 'https://galaxy.scalar.com/openapi.json' ? galaxySpecUrl : requested
    const specs = [...fabricOptions]
    if (selected && !specs.some(spec => spec.value === selected)) {
      try {
        if (['http:', 'https:'].includes(new URL(selected, window.location.href).protocol)) specs.push({value: selected, label: selected, openApiDocumentUrl: selected})
      } catch { /* Use the default fixture for malformed URLs. */ }
    }
    return {specs, spec: specs.find(spec => spec.value === selected)?.value ?? specs[0].value, renderer: renderers.find(item => item.value === query.get('renderer'))?.value ?? 'fabric'}
  }, [])
  const [spec, setSpec] = useState(initial.spec)
  const [renderer, setRenderer] = useState(initial.renderer)
  const [loading, setLoading] = useState(true)
  const rendererName = renderers.find(item => item.value === renderer)?.label ?? ''
  const source = useMemo(() => {
    const url = new URL(renderer === 'fabric' ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}renderer.html`, window.location.origin)
    url.searchParams.set('spec', spec)
    if (renderer !== 'fabric') url.searchParams.set('renderer', renderer)
    return url.href
  }, [spec, renderer])
  useEffect(() => {
    const syncTheme = (event: StorageEvent) => {if (event.key === 'fabric-theme' && (event.newValue === 'light' || event.newValue === 'dark')) setTheme(event.newValue)}
    window.addEventListener('storage', syncTheme)
    return () => window.removeEventListener('storage', syncTheme)
  }, [])
  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('spec', spec)
    url.searchParams.set('renderer', renderer)
    window.history.replaceState(null, '', url)
  }, [spec, renderer])
  return <div className="flex h-dvh flex-col overflow-hidden bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
    <header className="z-10 flex shrink-0 flex-wrap items-center gap-x-6 gap-y-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 sm:px-6">
      <span className="text-sm font-semibold">API comparison</span>
      <label className="flex min-w-0 flex-1 items-center gap-2 text-sm sm:flex-none"><span className="text-gray-500 dark:text-gray-400">Spec</span><Select value={spec} onValueChange={value => {setLoading(true); setSpec(value)}} options={initial.specs} className="min-h-9 min-w-0 flex-1 rounded-[--radius] border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 py-1.5 px-2 text-sm sm:max-w-96" aria-label="Specification" /></label>
      <label className="flex items-center gap-2 text-sm"><span className="text-gray-500 dark:text-gray-400">Renderer</span><Select value={renderer} onValueChange={value => {setLoading(true); setRenderer(value)}} options={renderers} className="min-h-9 rounded-[--radius] border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 py-1.5 px-2 text-sm" aria-label="OpenAPI renderer" /></label>
    </header>
    <main className="relative min-h-0 flex-1" aria-label={`${rendererName} preview`}>
      {loading && <p className="absolute inset-0 grid place-content-center bg-white dark:bg-gray-950 text-sm text-gray-500 dark:text-gray-400" role="status">Loading {rendererName}…</p>}
      <iframe key={source} src={source} title={`${rendererName} API reference`} className="h-full w-full border-0 bg-white dark:bg-gray-950" onLoad={() => setLoading(false)} />
    </main>
  </div>
}
