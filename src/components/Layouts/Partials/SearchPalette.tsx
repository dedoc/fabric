import {useEffect, useRef, useState} from 'react'
import {Dialog} from '@/components/UI/Dialog'
import Input from '@/components/UI/Input'
import {ArrowDownIcon, ArrowUpIcon, EnterIcon, SearchIcon} from '@/components/Icons'
import type {SearchEntry} from '@/core/search'
import SearchWorker from '@/components/Layouts/search.worker?worker&inline'
import type {SearchRequest, SearchResponse} from '@/components/Layouts/search.worker'
import MethodChip from '@/components/OpenApi/Partials/MethodChip'

export default function SearchPalette({entries, onNavigate}: {entries: SearchEntry[], onNavigate: (id: string) => void}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [completedQuery, setCompletedQuery] = useState('')
  const [results, setResults] = useState<SearchEntry[]>([])
  const [pending, setPending] = useState(false)
  const [selected, setSelected] = useState(0)
  const [shortcut, setShortcut] = useState('Ctrl+K')
  const trigger = useRef<HTMLButtonElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const worker = useRef<Worker | null>(null)
  const requestId = useRef(0)
  const isOpen = useRef(false)
  const isPending = useRef(false)
  const queryValue = useRef('')
  const navigateWhenReady = useRef(false)
  const navigate = useRef(onNavigate)
  navigate.current = onNavigate
  const currentEntries = useRef(entries)
  currentEntries.current = entries

  function post(request: SearchRequest) { worker.current?.postMessage(request) }
  function close() {
    isOpen.current = false
    isPending.current = false
    navigateWhenReady.current = false
    requestId.current++
    setPending(false)
    setOpen(false)
  }
  function select(id: string) { close(); navigate.current(id) }
  function search(value: string) {
    const id = ++requestId.current
    queryValue.current = value
    navigateWhenReady.current = false
    setQuery(value)
    setSelected(0)
    if (!isOpen.current) return
    isPending.current = !!value.trim()
    setPending(isPending.current)
    if (!value.trim()) {
      setCompletedQuery('')
      setResults(currentEntries.current.slice(0, 50))
    } else post({id, query: value})
  }
  function show() {
    if (!worker.current) {
      worker.current = new SearchWorker()
      worker.current.onmessage = (event: MessageEvent<SearchResponse>) => {
        if (event.data.id !== requestId.current || !isOpen.current) return
        isPending.current = false
        setPending(false)
        setCompletedQuery(queryValue.current)
        setResults(event.data.entries)
        setSelected(0)
        if (navigateWhenReady.current && event.data.entries.length) select(event.data.entries[0].id)
        navigateWhenReady.current = false
      }
      post({entries: currentEntries.current})
    }
    isOpen.current = true
    setOpen(true)
    search('')
  }
  useEffect(() => {
    if (worker.current) post({entries})
    if (isOpen.current) search(queryValue.current)
  }, [entries])
  useEffect(() => {
    setShortcut(/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘K' : 'Ctrl+K')
    const onShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k' && !event.isComposing) {
        event.preventDefault()
        event.stopPropagation()
        if (isOpen.current) close()
        else show()
      }
    }
    window.addEventListener('keydown', onShortcut, true)
    return () => {window.removeEventListener('keydown', onShortcut, true); worker.current?.terminate(); worker.current = null}
  }, [])
  useEffect(() => {if (open) list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView?.({block: 'nearest'})}, [selected, results, open])

  return <Dialog.Root open={open} onOpenChange={next => {if (next) show(); else close()}}>
    <Dialog.Trigger ref={trigger} className="mb-6 flex w-full cursor-text items-center gap-2 rounded-[--radius] border border-[color:var(--schema-border-color)] px-2.5 py-2 text-left text-sm text-gray-500 dark:text-gray-400 data-[search-restored-focus]:!outline-none">
      <SearchIcon className="size-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">Search reference…</span>
      <kbd className="-my-0.5 -mr-1 shrink-0 rounded bg-gray-100 px-2 py-1 font-sans text-xs leading-4 dark:bg-gray-800">{shortcut}</kbd>
    </Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Backdrop className="z-40" />
      <Dialog.Popup aria-label="Search reference" initialFocus={input} finalFocus={() => {
        const element = trigger.current
        if (element) {
          element.setAttribute('data-search-restored-focus', '')
          element.addEventListener('blur', () => element.removeAttribute('data-search-restored-focus'), {once: true})
        }
        return element
      }} className="fixed left-1/2 top-[min(15dvh,6rem)] z-50 max-h-[calc(100dvh-min(15dvh,6rem)-1rem)] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden p-0 text-gray-900">
        <Dialog.Title className="sr-only">Search reference</Dialog.Title>
        <div className="flex items-center gap-3 border-b border-gray-200 px-4 dark:border-gray-700">
          <Input ref={input} value={query} onChange={event => search(event.target.value)} type="text" role="combobox" aria-label="Search reference" aria-autocomplete="list" aria-expanded="true" aria-controls="reference-search-results" aria-activedescendant={results.length ? `reference-search-result-${selected}` : undefined} autoComplete="off" spellCheck={false} placeholder="Search operations, guides, schemas…" className="h-14 min-w-0 flex-1 bg-transparent text-base outline-none sm:text-sm" onKeyDown={event => {
            if (event.nativeEvent.isComposing) return
            if (event.key === 'Enter') {
              event.preventDefault()
              if (isPending.current) navigateWhenReady.current = true
              else if (results[selected]) select(results[selected].id)
            } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) && results.length) {
              event.preventDefault()
              setSelected(previous => event.key === 'Home' ? 0 : event.key === 'End' ? results.length - 1 : (previous + (event.key === 'ArrowDown' ? 1 : results.length - 1)) % results.length)
            }
          }} />
          <Dialog.Close aria-label="Close search" className="min-h-11 rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-100">Esc</Dialog.Close>
        </div>
        <div ref={list} id="reference-search-results" role="listbox" aria-label="Search results" aria-busy={pending} className="max-h-[min(60dvh,420px)] overflow-y-auto overscroll-contain p-2">
          {results.map((item, position) => <div role="option" aria-selected={selected === position} id={`reference-search-result-${position}`} key={item.id} className="flex cursor-pointer items-center gap-3 rounded-[--radius] px-3 py-3 text-sm aria-selected:bg-gray-100 dark:aria-selected:bg-white/5" onPointerMove={event => {if (event.pointerType !== 'touch') setSelected(position)}} onClick={() => select(item.id)}>
            <div className="min-w-0 flex-1"><div className="truncate font-medium dark:text-gray-100">{item.title}</div><div className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">{item.kind} · {item.detail}</div></div>
            {item.method && <MethodChip method={item.method} className="shrink-0 text-xs" />}
          </div>)}
          {!results.length && <p role="status" className="px-3 py-8 text-center text-sm text-gray-500 dark:text-gray-400">No results for “{completedQuery}”.</p>}
        </div>
        <div className="flex gap-4 border-t border-gray-200 px-4 py-3 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400"><span><ArrowUpIcon /> <ArrowDownIcon /> to navigate</span><span><EnterIcon /> to open</span><span className="ml-auto">{results.length} results</span></div>
      </Dialog.Popup>
    </Dialog.Portal>
  </Dialog.Root>
}
