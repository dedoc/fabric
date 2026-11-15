import type {Document, Parameter, Reference} from '@/core/openapi/types'
import {resolveReference} from '@/core/openapi/references'
import {getMediaExample, isJsonContentType, selectMediaExample} from '@/core/openapi/mediaExamples'
import type {RequestQueryPart} from '@/core/openapi/requestExamples/types'

export const encode = (value: string) => encodeURIComponent(value).replace(/[!'()*]/g, char => '%' + char.charCodeAt(0).toString(16).toUpperCase())
const text = (value: unknown): string => value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value)

function usesBracketedQuery(parameter: Parameter): boolean {
  return parameter.in === 'query' && parameter['x-deepObject-style'] === 'qs' && !Object.keys(parameter.content ?? {}).length
}

function bracketedQuery(parameter: Parameter, value: unknown, readableBrackets = false): string[] {
  const pairs: string[] = []
  const [open, close] = readableBrackets ? ['[', ']'] : ['%5B', '%5D']
  append(encodeParameterName(parameter.name, readableBrackets), value)
  return pairs

  function append(name: string, value: unknown): void {
    if (value !== null && typeof value === 'object') {
      for (const [key, item] of Object.entries(value)) {
        append(`${name}${open}${encode(key)}${close}`, item)
      }
      return
    }
    pairs.push(`${name}=${encodeQueryValue(value, parameter.allowReserved)}`)
  }
}

function encodeParameterName(name: string, readableBrackets: boolean): string {
  const encoded = encode(name)
  return readableBrackets ? encoded.replaceAll('%5B', '[').replaceAll('%5D', ']') : encoded
}

function encodeQueryValue(value: unknown, allowReserved?: boolean): string {
  const encoded = encode(text(value))
  // Keep delimiters (&, =, #) encoded even when reserved data characters are allowed.
  return allowReserved ? encoded.replace(/%(?:2F|3A|3F|40|24|2C|3B)/gi, part => decodeURIComponent(part)) : encoded
}

function serializeParameter(parameter: Parameter, value: unknown, readableBrackets = false): string | RequestQueryPart {
  if (usesBracketedQuery(parameter)) {
    return {pairs: bracketedQuery(parameter, value, readableBrackets), native: [parameter.name, value]}
  }
  const mediaType = Object.keys(parameter.content ?? {})[0]
  if (mediaType && !isJsonContentType(mediaType) && !mediaType.startsWith('text/')) throw new Error(`Unsupported parameter media type ${mediaType} for ${parameter.name}.`)
  if (mediaType?.startsWith('text/') && typeof value !== 'string') throw new Error(`Text content requires a string for ${parameter.name}.`)
  const [open, close] = readableBrackets ? ['[', ']'] : ['%5B', '%5D']
  const token = (item: unknown) => parameter.in === 'header' ? text(item) : encodeQueryValue(item, parameter.in === 'query' && parameter.allowReserved)
  const name = parameter.in === 'header' ? parameter.name : encodeParameterName(parameter.name, readableBrackets)
  const style = parameter.style ?? (parameter.in === 'query' || parameter.in === 'cookie' ? 'form' : 'simple')
  const explode = parameter.explode ?? (style === 'form')
  const allowed = parameter.in === 'path' ? ['simple', 'label', 'matrix'] : parameter.in === 'header' ? ['simple'] : parameter.in === 'cookie' ? ['form'] : ['form', 'spaceDelimited', 'pipeDelimited', 'deepObject']
  if (!allowed.includes(style)) throw new Error(`Unsupported ${style} serialization for ${parameter.name}.`)
  const array = !mediaType && Array.isArray(value)
  const object = !mediaType && value !== null && typeof value === 'object' && !array
  const entries = object ? Object.entries(value as Record<string, unknown>) : []
  if (entries.some(([, item]) => item !== null && typeof item === 'object') || (array && (value as unknown[]).some(item => item !== null && typeof item === 'object'))) throw new Error(`Nested parameter serialization is unsupported for ${parameter.name}. Use content with a JSON example.`)
  const scalar = mediaType && isJsonContentType(mediaType) ? JSON.stringify(value) : value
  const values = array ? (value as unknown[]).map(token) : object ? entries.flatMap(([key, item]) => explode ? [`${token(key)}=${token(item)}`] : [token(key), token(item)]) : [token(scalar)]
  if (parameter.in === 'path') {
    const delimiter = style === 'label' && explode ? '.' : ','
    const serialized = style === 'matrix' ? (explode && (array || object) ? values.map(item => `;${object ? '' : name + '='}${item}`).join('') : `;${name}=${values.join(',')}`) : (style === 'label' ? '.' : '') + values.join(delimiter)
    return serialized
  } else if (parameter.in === 'header') {
    const serialized = values.join(',')
    if (/[\r\n]/.test(parameter.name + serialized)) throw new Error(`Unsafe header value for ${parameter.name}.`)
    return serialized
  } else {
    let pairs: string[]
    let delimited: RequestQueryPart['delimited']
    if (style === 'deepObject') {
      // Stripe uses deepObject for arrays, serialized as repeated bracketed names.
      if (!object && !array) throw new Error(`deepObject requires a flat object or array for ${parameter.name}.`)
      pairs = array ? values.map(item => `${name}${open}${close}=${item}`)
        : entries.map(([key, item]) => `${name}${open}${encode(key)}${close}=${token(item)}`)
    } else if (style === 'form' && explode && (array || object)) {
      pairs = object ? entries.map(([key, item]) => `${encodeParameterName(key, readableBrackets)}=${token(item)}`) : values.map(item => `${name}=${item}`)
    } else {
      if (style !== 'form' && (!array || explode)) throw new Error(`Only non-exploded arrays support ${style} for ${parameter.name}.`)
      pairs = [`${name}=${values.join(style === 'spaceDelimited' ? '%20' : style === 'pipeDelimited' ? '|' : ',')}`]
      if (array || object) {
        const items = array ? (value as unknown[]).map(text) : entries.flatMap(([key, item]) => [key, text(item)])
        delimited = {name: parameter.name, items, separator: style === 'spaceDelimited' ? ' ' : style === 'pipeDelimited' ? '|' : ','}
      }
    }
    return {
      pairs,
      delimited,
      repeated: array && (style === 'deepObject' || (style === 'form' && explode)),
      native: !array && !object ? [parameter.name, scalar] : style === 'deepObject' && object ? [parameter.name, value] : undefined,
    }
  }
}

export function formatQueryExample(parameter: Parameter, value: unknown): unknown {
  try {
    const serialized = serializeParameter(parameter, value, true)
    return typeof serialized === 'string' ? value : serialized.pairs.join('&')
  } catch {
    // Keep the example visible when the document uses an unsupported serialization.
    return value
  }
}

/** Encode values separately from style punctuation, so slashes cannot alter the path. */
export function requestParameters(path: string, parameters: (Parameter | Reference)[], document: Document) {
  const queryParts: RequestQueryPart[] = [], headers: [string, string][] = [], cookies: string[] = []
  for (const entry of parameters) {
    const resolution = resolveReference<Parameter>(document, entry)
    if (!resolution.value || resolution.issues.length) throw new Error('Cannot resolve a request parameter.')
    const parameter = resolution.value
    const mediaEntry = Object.entries(parameter.content ?? {})[0]
    if (mediaEntry && !isJsonContentType(mediaEntry[0]) && !mediaEntry[0].startsWith('text/')) throw new Error(`Unsupported parameter media type ${mediaEntry[0]} for ${parameter.name}.`)
    const media = mediaEntry?.[1] ?? {schema: parameter.schema, example: parameter.example, examples: parameter.examples}
    const selected = selectMediaExample(media, undefined, document)
    const value = getMediaExample(selected.media, document.components ?? {}, true, document, () => { throw new Error(`Cannot resolve the schema for parameter ${parameter.name}.`) }, 'request')
    if (value === undefined) {
      if (parameter.required || parameter.in === 'path') throw new Error(`No sample is available for required parameter ${parameter.name}.`)
      continue
    }
    const serialized = serializeParameter(parameter, value)
    if (typeof serialized === 'string') {
      if (parameter.in === 'path') path = path.split(`{${parameter.name}}`).join(serialized)
      else headers.push([parameter.name, serialized])
    } else if (parameter.in === 'cookie') cookies.push(...serialized.pairs)
    else queryParts.push(serialized)
  }
  if (/\{[^}]+\}/.test(path)) throw new Error('A path parameter has no available sample.')
  if (cookies.length) headers.push(['Cookie', cookies.join('; ')])
  return {path, query: queryParts.flatMap(part => part.pairs).join('&'), queryParts, headers}
}
