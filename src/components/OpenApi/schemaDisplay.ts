import type {Document, Schema} from './types'
import {resolveReference} from './references'
import type {ReferenceIssue} from './references'
import type {SchemaPath} from './compositionExamples'

export type DisplayField = {schema: Schema, path: SchemaPath, allOfPaths?: SchemaPath[]}

/** Flatten only the documentation layout; retain every original field constraint and path. */
export function schemaDisplay(schema: Schema, document: Document, path: SchemaPath = [], allOfPaths?: SchemaPath[]) {
  const layers: {schema: Schema, path: SchemaPath}[] = []
  const issues: ReferenceIssue[] = []
  const recursive: SchemaPath[] = []
  const visit = (source: Schema, sourcePath: SchemaPath, active: Set<Schema>, overrides?: SchemaPath[]) => {
    const resolution = resolveReference<Schema>(document, source, 'schema')
    issues.push(...resolution.issues)
    const value = resolution.value
    if (!value) return
    if (active.has(source) || active.has(value)) { recursive.push(sourcePath); return }
    layers.push({schema: value, path: sourcePath})
    const next = new Set(active).add(source).add(value)
    value.allOf?.forEach((member, index) => visit(member, overrides?.[index] ?? [...sourcePath, 'allOf', index], next))
  }
  visit(schema, path, new Set(), allOfPaths)
  const properties = new Map<string, DisplayField>()
  const required = new Set<string>()
  const combine = (current: DisplayField | undefined, value: Schema, valuePath: SchemaPath): DisplayField => {
    if (!current) return {schema: value, path: valuePath}
    const members = current.allOfPaths ? current.schema.allOf! : [current.schema]
    return {schema: {allOf: [...members, value]}, path: current.path, allOfPaths: [...(current.allOfPaths ?? [current.path]), valuePath]}
  }
  let additionalProperties: DisplayField | undefined
  let items: DisplayField | undefined
  for (const layer of layers) {
    for (const name of layer.schema.required ?? []) required.add(name)
    for (const [name, property] of Object.entries(layer.schema.properties ?? {})) {
      properties.set(name, combine(properties.get(name), property, [...layer.path, 'properties', name]))
    }
    if (typeof layer.schema.additionalProperties === 'object') {
      additionalProperties = combine(additionalProperties, layer.schema.additionalProperties, [...layer.path, 'additionalProperties'])
    }
    if (layer.schema.items) items = combine(items, layer.schema.items, [...layer.path, 'items'])
  }
  return {layers, properties, required, additionalProperties, items, issues, recursive}
}
