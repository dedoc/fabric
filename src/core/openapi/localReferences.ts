export type LocalReferenceResult =
  | {status: 'resolved', value: unknown, chain: string[]}
  | {status: 'missing' | 'invalid' | 'external' | 'circular', reference: string, chain: string[]}

/**
 * Resolve a URI-fragment JSON Pointer against the complete source document.
 * Supports any local location, including components, paths, webhooks, nested
 * schemas, and array entries. Anchors and external documents are unsupported.
 *
 * Only follows $ref at the target itself. Nested references are left intact:
 * a schema referring to itself through properties/items is a resolved schema,
 * whereas an alias chain that never reaches a concrete value is circular.
 * Does not mutate the document or merge reference siblings (a caller concern).
 * Set follow=false to read a single target while a higher-level consumer applies
 * version-specific sibling rules to each link in the chain.
 */
export function resolveLocalReference(document: unknown, reference: string, follow = true): LocalReferenceResult {
  const chain: string[] = []
  const visited = new Set<string>()
  let current = reference

  while (true) {
    chain.push(current)
    if (!current.startsWith('#')) return {status: 'external', reference: current, chain}

    let pointer: string
    try { pointer = decodeURIComponent(current.slice(1)) }
    catch { return {status: 'invalid', reference: current, chain} }
    if (pointer !== '' && !pointer.startsWith('/')) return {status: 'invalid', reference: current, chain}
    const encodedTokens = pointer === '' ? [] : pointer.slice(1).split('/')
    if (encodedTokens.some(token => /~(?![01])/u.test(token))) return {status: 'invalid', reference: current, chain}
    const tokens = encodedTokens.map(token => token.replace(/~1/g, '/').replace(/~0/g, '~'))
    // Canonical tokens detect cycles even when URI encoding differs per hop.
    const key = JSON.stringify(tokens)
    if (visited.has(key)) return {status: 'circular', reference: current, chain}
    visited.add(key)

    let value: unknown = document
    for (const token of tokens) {
      if (value === null || typeof value !== 'object' || !Object.hasOwn(value, token)) {
        return {status: 'missing', reference: current, chain}
      }
      if (Array.isArray(value) && !/^(0|[1-9]\d*)$/u.test(token)) {
        return {status: 'missing', reference: current, chain}
      }
      value = (value as Record<string, unknown>)[token]
    }

    if (follow && value !== null && typeof value === 'object' && !Array.isArray(value) && Object.hasOwn(value, '$ref')) {
      const next = (value as Record<string, unknown>).$ref
      if (typeof next !== 'string') return {status: 'invalid', reference: current, chain}
      current = next
    } else {
      return {status: 'resolved', value, chain}
    }
  }
}
