import type {ComputedRef, InjectionKey} from 'vue'

export const schemaAncestorsKey: InjectionKey<ComputedRef<Set<object>>> = Symbol('schemaAncestors')
