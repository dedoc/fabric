import {inject, computed} from 'vue'
import type {Components} from '@/core/openapi/types'
import {documentKey} from '@/utils/symbols'
import {resolveReference} from '@/core/openapi/references'
import type {ReferenceKind} from '@/core/openapi/references'

export function useReferences(components: () => Components) {
  const provided = inject(documentKey, undefined)
  const document = computed(() => provided?.value ?? {components: components()})
  return {
    document,
    resolve: <T>(entry: unknown, kind: ReferenceKind = 'reference') => resolveReference<T>(document.value, entry, kind),
  }
}
