import {computed, inject, provide, reactive, ref} from 'vue'
import type {InjectionKey} from 'vue'
import type {MediaType} from '@/core/openapi/types'
import {provideCompositionSelections} from '@/components/OpenApi/useCompositionSelections'

const selectionsKey: InjectionKey<Map<string, string>> = Symbol('mediaTypeSelections')

/** Keep documentation and example selections together within one operation. */
export function provideMediaTypeSelections() {
  provide(selectionsKey, reactive(new Map<string, string>()))
  provideCompositionSelections()
}

export function useMediaType(content: () => Record<string, MediaType> | undefined, selectionKey?: () => string) {
  const selections = selectionKey ? inject(selectionsKey, undefined) : undefined
  const localType = ref('')
  const preferredType = computed({
    get: () => selections && selectionKey ? selections.get(selectionKey()) ?? '' : localType.value,
    set: (value: string) => {
      if (selections && selectionKey) selections.set(selectionKey(), value)
      else localType.value = value
    },
  })
  const types = computed(() => Object.keys(content() ?? {}))
  const type = computed({
    get: () => types.value.includes(preferredType.value) ? preferredType.value : types.value[0] ?? '',
    set: (value: string) => { preferredType.value = value },
  })
  const media = computed(() => content()?.[type.value])
  return {types, type, media}
}
