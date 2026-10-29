import type {Document, Schema} from '@/core/openapi/types'
import {resolveReference} from '@/core/openapi/references'
import type {ReferenceIssue, ReferenceResolution} from '@/core/openapi/references'

type Node = {schema: Schema, issues: ReferenceIssue[], children: Node[]}

/** Documents are immutable for one load. Replacing the document starts a new graph. */
const graphs = new WeakMap<Document, SchemaGraph>()

class SchemaGraph {
  private nodes = new WeakMap<Schema, Node>()
  private results = new WeakMap<Schema, ReferenceResolution<Schema>>()

  constructor(private document: Document) {}

  resolve(schema: Schema): ReferenceResolution<Schema> {
    const cached = this.results.get(schema)
    if (cached) return cached
    const pending: {node: Node, source: Schema}[] = []
    const intern = (source: Schema): Node => {
      const existing = this.nodes.get(source)
      if (existing) return existing
      const resolution = resolveReference<Schema>(this.document, source, 'schema')
      const target = resolution.value
      // References without siblings share the concrete target's node.
      const resolved = target && this.nodes.get(target)
      if (resolved) {
        this.nodes.set(source, resolved)
        return resolved
      }
      const node: Node = {schema: {...target}, issues: resolution.issues, children: []}
      this.nodes.set(source, node)
      this.nodes.set(node.schema, node)
      if (target) {
        this.nodes.set(target, node)
        pending.push({node, source: target})
      }
      return node
    }
    const root = intern(schema)
    // Iterative construction preserves sharing and back edges without a call-stack limit.
    for (let index = 0; index < pending.length; index++) {
      const {node, source} = pending[index]
      const child = (value: Schema): Schema => {
        const target = intern(value)
        node.children.push(target)
        return target.schema
      }
      if (source.properties) node.schema.properties = Object.fromEntries(Object.entries(source.properties).map(([name, value]) => [name, child(value)]))
      if (source.items) node.schema.items = child(source.items)
      if (typeof source.additionalProperties === 'object') node.schema.additionalProperties = child(source.additionalProperties)
      for (const key of ['allOf', 'oneOf', 'anyOf', 'prefixItems'] as const) {
        if (source[key]) node.schema[key] = source[key]!.map(child)
      }
    }
    const issues: ReferenceIssue[] = []
    const visited = new Set<Node>()
    const queue = [root]
    for (let index = 0; index < queue.length; index++) {
      const node = queue[index]
      if (visited.has(node)) continue
      visited.add(node)
      issues.push(...node.issues)
      queue.push(...node.children)
    }
    const result = {value: root.schema, issues}
    this.results.set(schema, result)
    return result
  }
}

/** A resolved schema is a graph: consumers must guard recursive traversal. */
export function resolveSchemaGraph(schema: Schema | undefined, document: Document): ReferenceResolution<Schema> {
  if (!schema) return {issues: []}
  let graph = graphs.get(document)
  if (!graph) {
    graph = new SchemaGraph(document)
    graphs.set(document, graph)
  }
  return graph.resolve(schema)
}
