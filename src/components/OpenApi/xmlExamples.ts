import type {Schema} from './types'

function escapeXml(value: unknown, attribute = false): string {
  // XML 1.0 cannot represent control characters or unpaired surrogates.
  const text = String(value).replace(/[^\u0009\u000A\u000D\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/gu, '')
  const escaped = text.replace(/[&<>"']/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'}[char]!))
  return attribute ? escaped.replace(/\t/g, '&#x9;').replace(/\n/g, '&#xA;').replace(/\r/g, '&#xD;') : escaped
}

function xmlName(name: string): string {
  const safe = name.replace(/[^\p{L}\p{N}\p{M}_.-]/gu, '_') || 'item'
  return /^[\p{L}_]/u.test(safe) ? safe : `_${safe}`
}

/** Follow the same composition branch as the JSON example generator. */
function effectiveSchema(schema: Schema = {}): Schema {
  const {allOf, oneOf, anyOf, ...own} = schema
  const branches = allOf ?? (oneOf?.[0] || anyOf?.[0] ? [oneOf?.[0] ?? anyOf![0]] : [])
  return [...branches.map(effectiveSchema), own].reduce<Schema>((result, part) => ({
    ...result, ...part,
    properties: {...result.properties, ...part.properties},
    xml: {...result.xml, ...part.xml},
  }), {})
}

/** Serialize a resolved example using OpenAPI XML names, attributes and arrays. */
export function createXmlExample(value: unknown, schema?: Schema, rootName = 'root'): string {
  function render(current: unknown, input: Schema | undefined, fallbackName: string, depth: number, inherited: Map<string, string>, ancestors: Set<object>, root = false): string {
    const currentSchema = effectiveSchema(input)
    const xml = currentSchema.xml ?? {}
    const indent = '  '.repeat(depth)
    const next = new Set(ancestors)
    if (current !== null && typeof current === 'object') {
      if (next.has(current)) current = null
      else next.add(current)
    }

    if (Array.isArray(current) && !xml.wrapped && !root) {
      // For unwrapped arrays, xml.name on the array is ignored; items own it.
      return current.map((item, index) => render(item, currentSchema.prefixItems?.[index] ?? currentSchema.items, fallbackName, depth, inherited, next)).filter(Boolean).join('\n')
    }

    const namespaces = new Map(inherited)
    const declared = new Map<string, string>()
    const attributes: string[] = []
    function qualifiedName(name: string, metadata: Schema['xml'], attribute = false): string {
      let prefix = metadata?.prefix ? xmlName(metadata.prefix) : attribute && metadata?.namespace ? 'ns' : ''
      const namespace = metadata?.namespace ?? (prefix ? namespaces.get(prefix) : undefined)
      if (namespace !== undefined && prefix) {
        const base = prefix
        let suffix = 1
        while (declared.has(prefix) && declared.get(prefix) !== namespace) prefix = `${base}${suffix++}`
      }
      if (namespace !== undefined && (!attribute || prefix)) {
        if (namespaces.get(prefix) !== namespace) {
          attributes.push(`${prefix ? `xmlns:${prefix}` : 'xmlns'}="${escapeXml(namespace, true)}"`)
          namespaces.set(prefix, namespace)
        }
        declared.set(prefix, namespace)
      }
      // Do not emit an unbound prefix when incomplete XML metadata is supplied.
      return `${prefix && namespace ? `${prefix}:` : ''}${xmlName(name)}`
    }

    const name = qualifiedName(xml.name ?? fallbackName, xml)
    const children: string[] = []
    if (Array.isArray(current)) {
      current.forEach((item, index) => {
        children.push(render(item, currentSchema.prefixItems?.[index] ?? currentSchema.items, xml.name ?? (root ? 'item' : fallbackName), depth + 1, namespaces, next))
      })
    } else if (current !== null && typeof current === 'object') {
      // Attributes must be collected before children so their prefixes are in scope.
      for (const [key, item] of Object.entries(current)) {
        const property = effectiveSchema(currentSchema.properties?.[key])
        if (property.xml?.attribute && item !== null && item !== undefined) {
          const attributeName = qualifiedName(property.xml.name ?? key, property.xml, true)
          attributes.push(`${attributeName}="${escapeXml(item, true)}"`)
        }
      }
      for (const [key, item] of Object.entries(current)) {
        const property = effectiveSchema(currentSchema.properties?.[key])
        if (!property.xml?.attribute && item !== undefined) children.push(render(item, property, key, depth + 1, namespaces, next))
      }
    }

    const opening = `<${name}${attributes.length ? ` ${attributes.join(' ')}` : ''}`
    const content = children.filter(Boolean).join('\n')
    if (content) return `${indent}${opening}>\n${content}\n${indent}</${name}>`
    if (current === null || current === undefined || typeof current === 'object') return `${indent}${opening}/>`
    return `${indent}${opening}>${escapeXml(current)}</${name}>`
  }

  return `<?xml version="1.0" encoding="UTF-8"?>\n${render(value, schema, rootName, 0, new Map([['xml', 'http://www.w3.org/XML/1998/namespace']]), new Set(), true)}`
}
