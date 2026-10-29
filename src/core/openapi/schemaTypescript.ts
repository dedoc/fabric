import type {Document, Schema} from '@/core/openapi/types'
import type {ReferenceIssue} from '@/core/openapi/references'
import {resolveSchemaGraph} from '@/core/openapi/schemaGraph'
import {resolveLocalReference} from '@/core/openapi/localReferences'

export type TypeScriptOutput = {code: string, issues: ReferenceIssue[]}

/** Produce a standalone declaration, retaining graph back edges as named types. */
export function createSchemaTypescript(schema: Schema, document: Document, name = 'Schema'): TypeScriptOutput {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    return {code: '', issues: [{reference: '', message: 'TypeScript output requires a supported Schema Object; boolean and non-object schemas are not supported.'}]}
  }
  const resolution = resolveSchemaGraph(schema, document)
  if (resolution.issues.length || !resolution.value) return {code: '', issues: resolution.issues}
  const root = resolution.value
  const rootName = typeName(name)
  const names = new Map<Schema, string>([[root, rootName]])
  const pending = [root]
  const active = new Map<Schema, number>()
  const usedNames = new Set([rootName])
  let declaration = root
  let useNamedReferences = false
  let visits = 0

  const nameNode = (node: Schema, preferred: string) => {
    if (names.has(node)) return
    const base = typeName(preferred)
    let candidate = base
    for (let suffix = 1; usedNames.has(candidate); suffix++) candidate = `${base}_${suffix}`
    names.set(node, candidate)
    usedNames.add(candidate)
    pending.push(node)
  }

  const render = (node: Schema, depth = 0, structureDepth = 0, sharedObjects?: Schema[]): string => {
    if (++visits > 10000 || depth > 100) throw new Error('TypeScript output exceeds the supported schema size or depth.')
    if (active.has(node)) {
      if (active.get(node) === structureDepth) throw new Error('TypeScript cannot represent a recursive composition without an object or array boundary.')
      nameNode(node, `${rootName}_${names.size}`)
      return names.get(node)!
    }
    if (useNamedReferences && node !== declaration && names.has(node)) return names.get(node)!
    active.set(node, structureDepth)
    const objects = sharedObjects ?? []
    const child = (value: Schema) => render(value, depth + 1, structureDepth)
    const intersected = (value: Schema) => render(value, depth + 1, structureDepth, value.nullable ? undefined : objects)
    const structured = (value: Schema) => render(value, depth + 1, structureDepth + 1)
    const base = (type?: string): string => {
      switch (type) {
        case 'string': return 'string'
        case 'integer': case 'number': return 'number'
        case 'boolean': return 'boolean'
        case 'null': return 'null'
        case 'array': {
          if (node.prefixItems) {
            // Prefix positions are optional unless minItems requires them.
            const prefix = node.prefixItems.map((item, index) => `${structured(item)}${index < (node.minItems ?? 0) ? '' : '?'}`)
            prefix.push(`...${node.items ? structured(node.items) : 'unknown'}[]`)
            return `[${prefix.join(', ')}]`
          }
          return `${node.items ? structured(node.items) : 'unknown'}[]`
        }
        case 'object': {
          if (!Array.isArray(node.type) && (Object.keys(node.properties ?? {}).length || node.required?.length)) {
            objects.push(node)
            return node.additionalProperties === undefined || node.additionalProperties === false
              ? 'unknown'
              : `{ [key: string]: ${typeof node.additionalProperties === 'object' ? structured(node.additionalProperties) : 'unknown'}; }`
          }
          const required = new Set(node.required ?? [])
          const properties = Object.entries(node.properties ?? {}).map(([key, value]) =>
            `  ${propertyName(key)}${required.has(key) ? '' : '?'}: ${unparenthesized(structured(value)).replace(/\n/g, '\n  ')};`
          )
          // required can name properties without an explicit property schema.
          for (const key of required) {
            if (!Object.hasOwn(node.properties ?? {}, key)) properties.push(`  ${propertyName(key)}: unknown;`)
          }
          const object = properties.length ? `{\n${properties.join('\n')}\n}` : 'object'
          if (node.additionalProperties === undefined || node.additionalProperties === false) return object
          const map = `{ [key: string]: ${typeof node.additionalProperties === 'object' ? structured(node.additionalProperties) : 'unknown'}; }`
          return properties.length ? `(${object} & ${map})` : map
        }
        case undefined: return 'unknown'
        default: throw new Error(`Unsupported schema type: ${type}`)
      }
    }
    const parts: string[] = []
    let excludeCompositionNull = false
    const inferred = node.properties || node.additionalProperties !== undefined || node.required ? 'object' : node.items || node.prefixItems ? 'array' : undefined
    if (!hasNarrowerPrimitiveLiterals(node)) {
      if (Array.isArray(node.type)) parts.push(union(node.type.map(base)))
      else if (node.type || inferred) {
        const type = base(node.type ?? inferred)
        if (type === 'object' && compositionGuaranteesObject(node)) {
          // The composed type already supplies the object restriction.
        } else if (type === 'object' && compositionGuaranteesObject(node, new Set(), true)) {
          excludeCompositionNull = true
        } else parts.push(type)
      }
    }
    if (Object.hasOwn(node, 'const')) parts.push(literalType(node.const))
    if (node.enum) parts.push(union(node.enum.map(literalType)))
    if (node.allOf) parts.push(...node.allOf.map(intersected))
    if (node.anyOf) parts.push(union(node.anyOf.map(child)))
    if (node.oneOf) parts.push(union(node.oneOf.map(child)))
    if (!sharedObjects && objects.length) {
      const required = new Set(objects.flatMap(object => object.required ?? []))
      const properties = new Map<string, Schema[]>()
      for (const object of objects) {
        for (const [key, value] of Object.entries(object.properties ?? {})) {
          properties.set(key, [...(properties.get(key) ?? []), value])
        }
      }
      for (const key of required) if (!properties.has(key)) properties.set(key, [])
      const fields = [...properties].map(([key, values]) => {
        const value = values.length > 1 ? {allOf: values} : values[0] ?? {}
        return `  ${propertyName(key)}${required.has(key) ? '' : '?'}: ${unparenthesized(structured(value)).replace(/\n/g, '\n  ')};`
      })
      parts.unshift(`{\n${fields.join('\n')}\n}`)
    }
    const constraints = [...new Set(parts.filter(part => part !== 'unknown' && !(objects.length && part === 'object')))]
    let type = constraints.length > 1 ? `(${constraints.join(' & ')})` : constraints[0] ?? 'unknown'
    if (excludeCompositionNull) type = `NonNullable<${unparenthesized(type)}>`
    active.delete(node)
    return node.nullable ? union([type, 'null']) : type
  }

  // Validate the graph without expanding every path through shared references.
  validateCompositionGraph(root)

  // Read source references because resolved graph nodes intentionally omit $ref.
  const sources = [schema]
  const seen = new Set<Schema>()
  for (let index = 0; index < sources.length; index++) {
    const source = sources[index]
    if (seen.has(source)) continue
    seen.add(source)
    if (seen.size > 10000) throw new Error('TypeScript output exceeds the supported schema size or depth.')
    if (source.$ref) {
      const target = resolveLocalReference(document, source.$ref, false)
      if (target.status === 'resolved') {
        const targetSchema = target.value as Schema
        const node = resolveSchemaGraph(targetSchema, document).value
        const pointerName = decodeURIComponent(source.$ref.slice(1)).split('/').at(-1)?.replace(/~1/g, '/').replace(/~0/g, '~') || 'Value'
        if (node) nameNode(node, pointerName)
        sources.push(targetSchema)
      }
      // OpenAPI 3.0 ignores reference siblings, including nested references.
      if (!/^3\.[12]\./.test(document.openapi ?? '')) continue
    }
    sources.push(...Object.values(source.properties ?? {}), ...(source.allOf ?? []), ...(source.anyOf ?? []), ...(source.oneOf ?? []), ...(source.prefixItems ?? []))
    if (source.items) sources.push(source.items)
    if (typeof source.additionalProperties === 'object') sources.push(source.additionalProperties)
  }
  useNamedReferences = true
  const declarations: string[] = []
  for (let index = 0; index < pending.length; index++) {
    const node = pending[index]
    declaration = node
    declarations.push(`export type ${names.get(node)!} = ${unparenthesized(render(node))};`)
  }
  return {code: declarations.join('\n\n'), issues: []}
}

/** Omit a bare object constraint only when a composition already implies it. */
function compositionGuaranteesObject(schema: Schema, active = new Set<Schema>(), allowNull = false): boolean {
  return !!schema.allOf?.some(member => guaranteesObject(member, active, allowNull))
    || !!schema.anyOf?.length && schema.anyOf.every(member => guaranteesObject(member, active, allowNull))
    || !!schema.oneOf?.length && schema.oneOf.every(member => guaranteesObject(member, active, allowNull))
}

function guaranteesObject(schema: Schema, active: Set<Schema>, allowNull: boolean): boolean {
  if (!allowNull && schema.nullable || active.has(schema)) return false
  if (schema.type === 'object' || schema.type === 'array') return true
  if (Array.isArray(schema.type) && schema.type.length && schema.type.every(type => type === 'object' || type === 'array' || allowNull && type === 'null')) return true
  if (schema.type === undefined && (schema.properties || schema.required || schema.additionalProperties !== undefined || schema.items || schema.prefixItems)) return true
  active.add(schema)
  const result = compositionGuaranteesObject(schema, active, allowNull)
  active.delete(schema)
  return result
}

/** Only composition-only cycles are invalid TypeScript aliases; structural cycles are legal. */
function validateCompositionGraph(root: Schema) {
  const nodes = [root]
  const seen = new Set<Schema>()
  const state = new Map<Schema, 'active' | 'done'>()
  for (let index = 0; index < nodes.length; index++) {
    const node = nodes[index]
    if (seen.has(node)) continue
    seen.add(node)
    if (seen.size > 10000) throw new Error('TypeScript output exceeds the supported schema size or depth.')
    const compositions = [...(node.allOf ?? []), ...(node.anyOf ?? []), ...(node.oneOf ?? [])]
    nodes.push(...Object.values(node.properties ?? {}), ...(node.prefixItems ?? []), ...compositions)
    if (node.items) nodes.push(node.items)
    if (typeof node.additionalProperties === 'object') nodes.push(node.additionalProperties)
    const stack: {node: Schema, exit: boolean}[] = [{node, exit: false}]
    while (stack.length) {
      const current = stack.pop()!
      if (current.exit) { state.set(current.node, 'done'); continue }
      if (state.get(current.node) === 'done') continue
      if (state.get(current.node) === 'active') throw new Error('TypeScript cannot represent a recursive composition without an object or array boundary.')
      state.set(current.node, 'active')
      stack.push({node: current.node, exit: true})
      for (const member of [...(current.node.allOf ?? []), ...(current.node.anyOf ?? []), ...(current.node.oneOf ?? [])]) stack.push({node: member, exit: false})
    }
  }
}

/** Literal types already carry compatible primitive type constraints. */
function hasNarrowerPrimitiveLiterals(schema: Schema): boolean {
  const types = Array.isArray(schema.type) ? [...schema.type] : [schema.type]
  if (schema.nullable) types.push('null')
  if (!types.every(type => ['string', 'number', 'integer', 'boolean', 'null'].includes(type ?? ''))) return false
  const values = Object.hasOwn(schema, 'const') ? [schema.const] : schema.enum
  return !!values && values.every(value => types.some(type =>
    type === 'null' ? value === null : type === 'integer' || type === 'number'
      ? typeof value === 'number' && Number.isFinite(value) : typeof value === type
  ))
}

/** At a property or declaration boundary, outer grouping is unnecessary. */
function unparenthesized(type: string): string {
  return type.startsWith('(') && type.endsWith(')') ? type.slice(1, -1) : type
}

function union(types: string[]): string {
  const unique = [...new Set(types.flatMap(unionMembers))].filter(type => type !== 'never')
  if (unique.includes('unknown')) return 'unknown'
  return unique.length > 1 ? `(${unique.join(' | ')})` : unique[0] ?? 'never'
}

/** Split only generated top-level unions, preserving quoted literals and nested types. */
function unionMembers(type: string): string[] {
  const expression = unparenthesized(type)
  const members: string[] = []
  let start = 0, depth = 0, quoted = false, escaped = false
  for (let index = 0; index < expression.length; index++) {
    const character = expression[index]
    if (quoted) {
      if (escaped) escaped = false
      else if (character === '\\') escaped = true
      else if (character === '"') quoted = false
    } else if (character === '"') quoted = true
    else if ('([{<'.includes(character)) depth++
    else if (')]}>'.includes(character)) depth--
    else if (character === '|' && depth === 0) { members.push(expression.slice(start, index).trim()); start = index + 1 }
  }
  if (!members.length) return [type]
  members.push(expression.slice(start).trim())
  return members.flatMap(unionMembers)
}

function literalType(value: unknown): string {
  if (value === null) return 'null'
  if (typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(literalType).join(', ')}]`
  if (typeof value === 'object' && value) return `{ ${Object.entries(value).map(([key, item]) => `${propertyName(key)}: ${literalType(item)};`).join(' ')} }`
  throw new Error('TypeScript literals require JSON values.')
}

function propertyName(name: string): string {
  return /^[$_\p{ID_Start}][$\u200c\u200d\p{ID_Continue}]*$/u.test(name) ? name : JSON.stringify(name)
}

const reservedTypeNames = new Set(('break case catch class const continue debugger default delete do else enum export extends false finally for function if import in instanceof new null return super switch this throw true try typeof var void while with implements interface let package private protected public static yield await any bigint boolean intrinsic never number object string symbol undefined unknown NonNullable').split(' '))

function typeName(name: string): string {
  let result = name.replace(/[^$\u200c\u200d\p{ID_Continue}]/gu, '_') || 'Value'
  if (!/^[$_\p{ID_Start}]/u.test(result)) result = `_${result}`
  return reservedTypeNames.has(result) ? `${result}_` : result
}
