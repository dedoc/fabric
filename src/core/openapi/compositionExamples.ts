import type {Document, Schema} from '@/core/openapi/types'
import {resolveReference} from '@/core/openapi/references'

export type SchemaPath = (string | number)[]
export const compositionPathKey = (path: SchemaPath) => JSON.stringify(path)

/** Project selected alternatives without changing the source document or allOf semantics. */
export function selectExampleSchema(schema: Schema | undefined, document: Document, selections: ReadonlyMap<string, number>) {
  const selectedPaths = [...selections.keys()].map(key => JSON.parse(key) as SchemaPath)
  function visit(current: Schema, path: SchemaPath, ancestors: Set<Schema>): {schema: Schema, changed: boolean} {
    // Unselected subgraphs retain their source identity, including shared references.
    if (!selectedPaths.some(selected => path.every((part, index) => selected[index] === part))) return {schema: current, changed: false}
    const resolved = resolveReference<Schema>(document, current, 'schema').value
    if (!resolved || ancestors.has(resolved)) return {schema: current, changed: false}
    const next = new Set(ancestors).add(resolved)
    const result = {...resolved}
    let changed = false
    function child(value: Schema, childPath: SchemaPath) {
      const projected = visit(value, childPath, next)
      changed ||= projected.changed
      return projected.schema
    }
    if (result.properties) result.properties = Object.fromEntries(Object.entries(result.properties).map(([name, value]) => [name, child(value, [...path, 'properties', name])]))
    if (result.items) result.items = child(result.items, [...path, 'items'])
    if (typeof result.additionalProperties === 'object') result.additionalProperties = child(result.additionalProperties, [...path, 'additionalProperties'])
    for (const key of ['allOf', 'anyOf', 'oneOf', 'prefixItems'] as const) {
      const members = result[key]
      if (!members?.length) continue
      const selected = selections.get(compositionPathKey([...path, key]))
      if ((key === 'oneOf' || key === 'anyOf') && selected !== undefined && members[selected]) {
        result[key] = [child(members[selected], [...path, key, selected])]
        changed = true
      } else result[key] = members.map((value, index) => child(value, [...path, key, index]))
    }
    // An authored parent example may describe a different branch. Preserve examples on
    // the chosen child, but regenerate ancestors after an explicit branch selection.
    if (changed) { delete result.example; delete result.examples; delete result.default }
    return {schema: result, changed}
  }
  return schema ? visit(schema, [], new Set()) : {schema, changed: false}
}
