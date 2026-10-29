import {ComputedRef, InjectionKey, Ref} from "vue";
import type {Document} from "@/core/openapi/types.ts";

export const documentKey = Symbol() as InjectionKey<Ref<Document>>
export const showSchemasKey = Symbol() as InjectionKey<ComputedRef<boolean>>
