import type {ComputedRef, InjectionKey} from 'vue'
import type {SchemaDirection} from '@/core/openapi/schemaUsage'

export const schemaDirectionKey: InjectionKey<ComputedRef<SchemaDirection>> = Symbol('schemaDirection')
