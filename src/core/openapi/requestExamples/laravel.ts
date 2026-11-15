import type {RequestExample, RequestExampleSender} from '@/core/openapi/requestExamples/types'
import {isFormContentType} from '@/core/openapi/formExamples'
import {encode} from '@/core/openapi/requestExamples/parameters'

const quote = (value: string) => "'" + value.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'"

function php(value: unknown, level = 0): string {
  if (value == null) return 'null'
  if (typeof value === 'string') return quote(value)
  if (typeof value !== 'object') return String(value)
  const array = Array.isArray(value)
  const entries = array ? value.map(item => [undefined, item] as const) : Object.entries(value)
  if (!entries.length) return array ? '[]' : '(object) []'
  return phpArray(entries.map(([name, item]) => [name, php(item, level + 1)]), level)
}

function phpArray(entries: [string | undefined, string][], level: number): string {
  if (!entries.length) return '[]'
  const indent = '    '.repeat(level + 1)
  return '[\n' + entries.map(([name, expression]) => `${indent}${name === undefined ? '' : quote(name) + ' => '}${expression},`).join('\n') + '\n' + '    '.repeat(level) + ']'
}

function queryValue(value: unknown): unknown {
  if (value == null || typeof value === 'boolean') return value == null ? '' : String(value)
  if (typeof value === 'number' && !Number.isSafeInteger(value)) return String(value)
  if (Array.isArray(value)) return value.map(queryValue)
  if (typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, queryValue(item)]))
  return value
}

function decodePair(pair: string): [string, string] {
  const equals = pair.indexOf('=')
  return [decodeURIComponent(pair.slice(0, equals)), decodeURIComponent(pair.slice(equals + 1))]
}

function laravelQuery(parts: NonNullable<RequestExample['query']>['parts']) {
  const pairs = parts.flatMap(part => part.pairs)
  const inputs = pairs.map(decodePair)
  const canonical = inputs.every(([key, value], index) => `${encode(key)}=${encode(value)}` === pairs[index])
  const flat = new Map<string, string[]>()
  for (const [key, value] of inputs) {
    const values = flat.get(key)
    if (values) values.push(value)
    else flat.set(key, [value])
  }

  if (canonical && flat.size === inputs.length && !parts.some(part => part.repeated && part.pairs.length)) {
    let offset = 0
    const entries: [string, (level: number) => string][] = []
    for (const {pairs, native, delimited} of parts) {
      const fields = inputs.slice(offset, offset + pairs.length)
      offset += pairs.length
      if (!fields.length) continue
      if (native) entries.push([native[0], level => php(queryValue(native[1]), level)])
      else if (delimited) entries.push([delimited.name, level => `implode(${quote(delimited.separator)}, ${php(delimited.items, level)})`])
      else for (const [key, value] of fields) entries.push([key, () => quote(value)])
    }
    if (new Set(entries.map(([key]) => key)).size === entries.length) {
      return {array: (level: number) => phpArray(entries.map(([key, render]) => [key, render(level + 1)]), level)}
    }
  }

  if (canonical && [...flat].flatMap(([key, values]) => values.map(value => `${encode(key)}=${encode(value)}`)).every((pair, index) => pair === pairs[index])) {
    const grouped = [...flat].map(([key, values]) => [key, values.length > 1 ? values : values[0]] as const)
    return {build: (level: number) => `Query::build(${phpArray(grouped.map(([key, value]) => [key, php(value, level + 1)]), level)})`}
  }

  const repeatedParts = new Map(parts.filter(part => part.repeated && part.pairs.length).flatMap(part => {
    const fields = part.pairs.map(decodePair)
    const key = fields[0][0]
    return fields.every(([name, value], index) => name === key && `${encode(name)}=${encode(value)}` === part.pairs[index])
      ? [[part, [key, fields.map(([, value]) => value)] as const] as const]
      : []
  }))
  return {usesBuilder: repeatedParts.size > 0, serialized: (level: number) => `implode('&', ${phpArray(parts.flatMap(part => {
    const {pairs, delimited} = part
    const repeated = repeatedParts.get(part)
    if (repeated) {
      const [key, values] = repeated
      return [[undefined, `Query::build(${php({[key]: values}, level + 1)})`] as [undefined, string]]
    }
    if (delimited && pairs[0] === `${encode(delimited.name)}=${delimited.items.map(encode).join(delimited.separator)}`) {
      const items = php(delimited.items, level + 2)
      const encodedItems = delimited.items.some(item => encode(item) !== item) ? `array_map('rawurlencode', ${items})` : items
      return [[undefined, `${quote(encode(delimited.name) + '=')} . implode(${quote(delimited.separator)}, ${encodedItems})`] as [undefined, string]]
    }
    return pairs.map(pair => [undefined, quote(pair)] as [undefined, string])
  }), level)})`}
}

export const laravelSender: RequestExampleSender = {
  id: 'laravel',
  label: 'Laravel',
  generate(request) {
    const lines = ['use Illuminate\\Support\\Facades\\Http;', '', '$response = Http::']
    let client = ''
    let options: Record<string, unknown> | undefined
    const type = request.contentType.split(';')[0].trim().toLowerCase()
    if (isFormContentType(type) && typeof request.value !== 'string') {
      const names = request.formFields.map(([name]) => name)
      if (new Set(names).size === names.length) {
        client = 'asForm()'
        options = {form_params: request.formFields.length ? Object.fromEntries(request.formFields) : []}
      } else {
        // Guzzle's form_params uses bracketed array names. Preserve OpenAPI's repeated names.
        const body = request.formFields.map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(value)}`).join('&')
        client = `withBody(${quote(body)}, ${quote(request.contentType)})`
      }
    } else if (type === 'multipart/form-data') {
      client = 'asMultipart()'
      options = {multipart: request.formFields.map(([name, contents]) => ({name, contents}))}
      for (const [name, filename] of request.formFiles ?? []) client += `\n    ->attach(${quote(name)}, fopen(${quote(filename)}, 'r'), ${quote(filename)})`
    } else if (request.bodyFile) {
      client = `withBody(file_get_contents(${quote(request.bodyFile)}), ${quote(request.contentType)})`
    } else if (request.body !== '' && request.value !== null && (type === 'application/json' || type.endsWith('+json'))) {
      client = `withHeaders(['Content-Type' => ${quote(request.contentType)}])`
      options = {json: request.value}
    } else if (request.body !== '') {
      client = `withBody(${quote(request.body)}, ${quote(request.contentType)})`
    } else if (request.contentType) {
      client = `withHeaders(['Content-Type' => ${quote(request.contentType)}])`
    }
    const headers = Object.fromEntries(request.headers ?? [])
    if (Object.keys(headers).length) {
      const auth = `withHeaders([${Object.entries(headers).map(([name, value]) => `${quote(name)} => ${quote(value)}`).join(', ')}])`
      client = auth + (client ? '\n    ->' + client : '')
    }
    const query = request.query && laravelQuery(request.query.parts)
    const queryString = query?.build ?? query?.serialized
    const getQuery = request.method === 'GET' && !request.contentType && !request.body && !request.bodyFile
      ? query?.array ?? queryString
      : undefined
    if (query?.array && !getQuery) {
      const call = `withQueryParameters(${query.array(client ? 1 : 0)})`
      client += (client ? '\n    ->' : '') + call
    }
    if (query?.build || query?.usesBuilder) lines.unshift('use GuzzleHttp\\Psr7\\Query;')
    const level = client ? 1 : 0
    const url = request.query?.url ?? request.url
    let call: string
    if (getQuery) {
      call = `get(${quote(url)}, ${getQuery(level)});`
    } else {
      const requestOptions = Object.entries(options ?? {}).map(([name, value]): [string, string] => [name, php(value, level + 1)])
      if (queryString) requestOptions.unshift(['query', queryString(level + 1)])
      call = `send(${quote(request.method)}, ${quote(url)}${requestOptions.length ? ', ' + phpArray(requestOptions, level) : ''});`
    }
    lines[lines.length - 1] += client ? client + '\n    ->' + call : call
    return lines.join('\n')
  },
}
