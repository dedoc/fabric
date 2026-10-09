import type {Document, Parameter, Reference} from '../types'
import {resolveReference} from '../references'
import {getMediaExample, isJsonContentType, selectMediaExample} from '../mediaExamples'

const encode = (value: string) => encodeURIComponent(value).replace(/[!'()*]/g, char => '%' + char.charCodeAt(0).toString(16).toUpperCase())
const text = (value: unknown): string => value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value)

/** Encode values separately from style punctuation, so slashes cannot alter the path. */
export function requestParameters(path: string, parameters: (Parameter | Reference)[], document: Document) {
  const query: string[] = [], headers: [string, string][] = [], cookies: string[] = []
  for (const entry of parameters) {
    const resolution = resolveReference<Parameter>(document, entry)
    if (!resolution.value || resolution.issues.length) throw new Error('Cannot resolve a request parameter.')
    const parameter = resolution.value
    const mediaEntry = Object.entries(parameter.content ?? {})[0]
    if (mediaEntry && !isJsonContentType(mediaEntry[0]) && !mediaEntry[0].startsWith('text/')) throw new Error(`Unsupported parameter media type ${mediaEntry[0]} for ${parameter.name}.`)
    const media = mediaEntry?.[1] ?? {schema: parameter.schema, example: parameter.example, examples: parameter.examples}
    const selected = selectMediaExample(media, undefined, document)
    const value = getMediaExample(selected.media, document.components ?? {}, true, document, () => { throw new Error(`Cannot resolve the schema for parameter ${parameter.name}.`) }, 'request')
    if (mediaEntry && !isJsonContentType(mediaEntry[0]) && typeof value !== 'string') throw new Error(`Text content requires a string for ${parameter.name}.`)
    if (value === undefined) {
      if (parameter.required || parameter.in === 'path') throw new Error(`No sample is available for required parameter ${parameter.name}.`)
      continue
    }
    const style = parameter.style ?? (parameter.in === 'query' || parameter.in === 'cookie' ? 'form' : 'simple')
    const explode = parameter.explode ?? (style === 'form')
    const allowed = parameter.in === 'path' ? ['simple', 'label', 'matrix'] : parameter.in === 'header' ? ['simple'] : parameter.in === 'cookie' ? ['form'] : ['form', 'spaceDelimited', 'pipeDelimited', 'deepObject']
    if (!allowed.includes(style)) throw new Error(`Unsupported ${style} serialization for ${parameter.name}.`)
    const token = (item: unknown) => {
      const encoded = encode(text(item))
      // Keep delimiters (&, =, #) encoded even when reserved data characters are allowed.
      return parameter.in === 'header' ? text(item) : parameter.in === 'query' && parameter.allowReserved ? encoded.replace(/%(?:2F|3A|3F|40|24|2C|3B)/gi, part => decodeURIComponent(part)) : encoded
    }
    const name = parameter.in === 'header' ? parameter.name : encode(parameter.name)
    const array = !mediaEntry && Array.isArray(value)
    const object = !mediaEntry && value !== null && typeof value === 'object' && !array
    const entries = object ? Object.entries(value as Record<string, unknown>) : []
    if (entries.some(([, item]) => item !== null && typeof item === 'object') || (array && (value as unknown[]).some(item => item !== null && typeof item === 'object'))) throw new Error(`Nested parameter serialization is unsupported for ${parameter.name}. Use content with a JSON example.`)
    const scalar = mediaEntry && isJsonContentType(mediaEntry[0]) ? JSON.stringify(value) : value
    const values = array ? (value as unknown[]).map(token) : object ? entries.flatMap(([key, item]) => explode ? [`${token(key)}=${token(item)}`] : [token(key), token(item)]) : [token(scalar)]
    if (parameter.in === 'path') {
      const delimiter = style === 'label' && explode ? '.' : ','
      const serialized = style === 'matrix' ? (explode && (array || object) ? values.map(item => `;${object ? '' : name + '='}${item}`).join('') : `;${name}=${values.join(',')}`) : (style === 'label' ? '.' : '') + values.join(delimiter)
      path = path.split(`{${parameter.name}}`).join(serialized)
    } else if (parameter.in === 'header') {
      const serialized = values.join(',')
      if (/[\r\n]/.test(parameter.name + serialized)) throw new Error(`Unsafe header value for ${parameter.name}.`)
      headers.push([parameter.name, serialized])
    } else {
      let pairs: string[]
      if (style === 'deepObject') {
        // Stripe uses deepObject for arrays, serialized as repeated bracketed names.
        if (!object && !array) throw new Error(`deepObject requires a flat object or array for ${parameter.name}.`)
        pairs = array ? values.map(item => `${name}%5B%5D=${item}`)
          : entries.map(([key, item]) => `${name}%5B${encode(key)}%5D=${token(item)}`)
      } else if (style === 'form' && explode && (array || object)) {
        pairs = object ? entries.map(([key, item]) => `${encode(key)}=${token(item)}`) : values.map(item => `${name}=${item}`)
      } else {
        if (style !== 'form' && (!array || explode)) throw new Error(`Only non-exploded arrays support ${style} for ${parameter.name}.`)
        pairs = [`${name}=${values.join(style === 'spaceDelimited' ? '%20' : style === 'pipeDelimited' ? '|' : ',')}`]
      }
      if (parameter.in === 'cookie') cookies.push(...pairs)
      else query.push(...pairs)
    }
  }
  if (/\{[^}]+\}/.test(path)) throw new Error('A path parameter has no available sample.')
  if (cookies.length) headers.push(['Cookie', cookies.join('; ')])
  return {path, query: query.join('&'), headers}
}
