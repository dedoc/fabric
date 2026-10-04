import {ComputedRef, InjectionKey, Ref} from "vue";
import {Document} from "../components/OpenApi/types.ts";

export const documentKey = Symbol() as InjectionKey<Ref<Document>>
export const showSchemasKey = Symbol() as InjectionKey<ComputedRef<boolean>>
