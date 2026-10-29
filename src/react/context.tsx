import {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react'
import type {Dispatch, ReactNode, SetStateAction} from 'react'
import type {Components, Document, MediaType} from '@/core/openapi/types'
import type {SchemaDirection} from '@/core/openapi/schemaUsage'
import {resolveReference} from '@/core/openapi/references'
import type {ReferenceKind} from '@/core/openapi/references'
import {selectExampleSchema} from '@/core/openapi/compositionExamples'

export const DocumentContext = createContext<Document | undefined>(undefined)
export const ShowSchemasContext = createContext(true)
export const SchemaDirectionContext = createContext<SchemaDirection>('neutral')
export const SchemaAncestorsContext = createContext<ReadonlySet<object>>(new Set())
export const CompositionScopeContext = createContext('schema')

type CompositionState = Map<string, Map<string, number>>
type Store<T> = {values: T, setValues: Dispatch<SetStateAction<T>>}
const MediaSelectionsContext = createContext<Store<Map<string, string>> | undefined>(undefined)
const CompositionSelectionsContext = createContext<Store<CompositionState> | undefined>(undefined)
const emptySelections: ReadonlyMap<string, number> = new Map()

export function OperationSelectionsProvider({children}: {children: ReactNode}) {
  const [media, setMedia] = useState(() => new Map<string, string>())
  const [composition, setComposition] = useState<CompositionState>(() => new Map())
  const mediaStore = useMemo(() => ({values: media, setValues: setMedia}), [media])
  const compositionStore = useMemo(() => ({values: composition, setValues: setComposition}), [composition])
  return <MediaSelectionsContext.Provider value={mediaStore}><CompositionSelectionsContext.Provider value={compositionStore}>{children}</CompositionSelectionsContext.Provider></MediaSelectionsContext.Provider>
}

export function useReferences(components: Components) {
  const provided = useContext(DocumentContext)
  const document = useMemo(() => provided ?? {components}, [provided, components])
  return useMemo(() => ({document, resolve: <T,>(entry: unknown, kind: ReferenceKind = 'reference') => resolveReference<T>(document, entry, kind)}), [document])
}

export function useMediaType(content: Record<string, MediaType> | undefined, selectionKey?: string) {
  const store = useContext(MediaSelectionsContext)
  const [localType, setLocalType] = useState('')
  const preferredType = store && selectionKey ? store.values.get(selectionKey) ?? '' : localType
  const types = Object.keys(content ?? {})
  const type = types.includes(preferredType) ? preferredType : types[0] ?? ''
  const setType = useCallback((value: string) => {
    if (store && selectionKey) store.setValues(previous => new Map(previous).set(selectionKey, value))
    else setLocalType(value)
  }, [store, selectionKey])
  return {types, type, setType, media: content?.[type]}
}

export function useCompositionSelections(explicitScope?: string) {
  const store = useContext(CompositionSelectionsContext)
  const inheritedScope = useContext(CompositionScopeContext)
  const [local, setLocal] = useState<CompositionState>(() => new Map())
  const scope = explicitScope ?? inheritedScope
  const scopes = store?.values ?? local
  const setScopes = store?.setValues ?? setLocal
  const select = useCallback((path: string, index: number) => {
    setScopes(previous => {
      const selections = new Map(previous.get(scope)).set(path, index)
      return new Map(previous).set(scope, selections)
    })
  }, [scope, setScopes])
  return {selections: scopes.get(scope) ?? emptySelections, select}
}

export function useCompositionExample(media: MediaType | undefined, scope: string, components: Components) {
  const {selections} = useCompositionSelections(scope)
  const references = useReferences(components)
  return useMemo(() => {
    if (!media || !selections.size) return media
    const projected = selectExampleSchema(media.schema, references.document, selections)
    if (!projected.changed) return media
    const {example, examples, ...rest} = media
    return {...rest, schema: projected.schema}
  }, [media, selections, references.document])
}

export function useStoredChoice<T extends string>(key: string, choices: readonly T[], fallback: T): [T, Dispatch<SetStateAction<T>>] {
  const [choice, setChoice] = useState<T>(() => {
    try {
      const saved = window.localStorage.getItem(key)
      return choices.find(value => value === saved) ?? fallback
    } catch { return fallback }
  })
  useEffect(() => {
    if (!choices.includes(choice)) return
    try { window.localStorage.setItem(key, choice) }
    catch { /* Keep selections usable when storage is unavailable. */ }
  }, [key, choice, choices])
  return [choice, setChoice]
}
