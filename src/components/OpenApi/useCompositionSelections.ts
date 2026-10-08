import {computed, inject, provide, reactive} from 'vue'
import type {ComputedRef, InjectionKey} from 'vue'
import type {Components, MediaType} from './types'
import {selectExampleSchema} from './compositionExamples'
import {useReferences} from './useReferences'

const selectionsKey: InjectionKey<Map<string, Map<string, number>>> = Symbol('compositionSelections')
const scopeKey: InjectionKey<ComputedRef<string>> = Symbol('compositionScope')

export function provideCompositionSelections() {
  provide(selectionsKey, reactive(new Map()))
}

export function provideCompositionScope(scope: ComputedRef<string>) {
  provide(scopeKey, scope)
}

export function useCompositionSelections(explicitScope?: () => string) {
  const scopes = inject(selectionsKey, undefined) ?? reactive(new Map<string, Map<string, number>>())
  const inheritedScope = inject(scopeKey, computed(() => 'schema'))
  const scope = () => explicitScope?.() ?? inheritedScope.value
  const selections = computed(() => scopes.get(scope()) ?? new Map<string, number>())
  function select(path: string, index: number) {
    if (!scopes.has(scope())) scopes.set(scope(), new Map())
    scopes.get(scope())!.set(path, index)
  }
  return {selections, select}
}

export function useCompositionExample(media: () => MediaType | undefined, scope: () => string, components: () => Components) {
  const {selections} = useCompositionSelections(scope)
  const references = useReferences(components)
  return computed(() => {
    const source = media()
    if (!source || !selections.value.size) return source
    const projected = selectExampleSchema(source.schema, references.document.value, selections.value)
    if (!projected.changed) return source
    const {example, examples, ...rest} = source
    return {...rest, schema: projected.schema}
  })
}
