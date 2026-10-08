import type {Components, Document, MediaType} from './types'
import {getMediaExample} from './mediaExamples'

export function isFormContentType(contentType: string): boolean {
  return contentType.split(';')[0].trim().toLowerCase() === 'application/x-www-form-urlencoded'
}

/** Form values are shared by request senders before transport-specific escaping. */
export function createFormFields(media: MediaType | undefined, components: Components, document: Document = {components}): [string, string][] {
  const value = getMediaExample(media, components, true, document)
  if (value === undefined) return []
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return []

  const arguments_: [string, string][] = []
  const text = (item: unknown): string => item == null ? '' : typeof item === 'object' ? JSON.stringify(item) : String(item)
  const field = (name: string, item: unknown) => {
    arguments_.push([name, text(item)])
  }
  for (const [name, item] of Object.entries(value)) {
    const encoding = media?.encoding?.[name]
    const style = encoding?.style ?? 'form'
    const explode = encoding?.explode ?? (style === 'form')
    const parameterEncoding = encoding?.style !== undefined || encoding?.explode !== undefined || encoding?.allowReserved !== undefined
    if (Array.isArray(item)) {
      if (!parameterEncoding || explode) item.forEach(entry => field(name, entry))
      else field(name, item.map(text).join(style === 'spaceDelimited' ? ' ' : style === 'pipeDelimited' ? '|' : ','))
    } else if (item !== null && typeof item === 'object' && parameterEncoding) {
      const entries = Object.entries(item)
      if (style === 'deepObject') entries.forEach(([key, entry]) => field(`${name}[${key}]`, entry))
      else if (explode) entries.forEach(([key, entry]) => field(key, entry))
      else field(name, entries.flatMap(([key, entry]) => [key, text(entry)]).join(','))
    } else {
      // OpenAPI's default content type for complex form properties is JSON.
      field(name, item)
    }
  }
  return arguments_
}

/** curl encodes field values; field names must already be URL-encoded. */
export function createFormArguments(media: MediaType | undefined, components: Components): [string, string][] {
  const value = getMediaExample(media, components)
  if (typeof value === 'string') return [['--data-raw', value]]
  return createFormFields(media, components).map(([name, value]) => ['--data-urlencode', `${encodeURIComponent(name)}=${value}`])
}
