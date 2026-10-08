import {inject, provide, ref} from 'vue'
import type {InjectionKey, Ref} from 'vue'
import type {Document, Operation} from './types'
import {httpAuthKind, operationSecurity} from './security'
import {basicAuthorization} from './requestExamples/auth'

export type BasicCredentials = {username: string, password: string}
export type BearerCredentials = {token: string}
export type AuthCredentials = BasicCredentials | BearerCredentials
export type HttpAuthOption = {name: string, kind: 'basic' | 'bearer', credentials?: AuthCredentials}
const credentialsKey: InjectionKey<Ref<Record<string, AuthCredentials>>> = Symbol('authCredentials')

export function provideAuthCredentials() {
  const credentials = ref<Record<string, AuthCredentials>>({})
  provide(credentialsKey, credentials)
  return credentials
}

export function useAuthCredentials() {
  return inject(credentialsKey, undefined)
}

export function authorizationForOption(option?: HttpAuthOption): string | undefined {
  const value = option?.credentials
  if (option?.kind === 'basic' && value && 'username' in value && value.username) return basicAuthorization(value.username, value.password)
  if (option?.kind === 'bearer' && value && 'token' in value && value.token.trim()) return `Bearer ${value.token.trim()}`
}

export function httpAuthForOperation(operation: Operation, document: Document, credentials: Record<string, AuthCredentials>): HttpAuthOption | undefined {
  const options: HttpAuthOption[] = []
  // Do not choose a partial option when different methods are required together.
  for (const group of operationSecurity(operation, document)) {
    if (group.length !== 1) continue
    const {name, scheme} = group[0]
    const kind = httpAuthKind(scheme)
    if (kind) options.push({name, kind, credentials: credentials[name]})
  }
  return options.find(option => !!authorizationForOption(option)) ?? options[0]
}
