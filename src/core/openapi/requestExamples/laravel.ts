import type {RequestExampleSender} from '@/core/openapi/requestExamples/types'
import {isFormContentType} from '@/core/openapi/formExamples'

const quote = (value: string) => "'" + value.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'"

function php(value: unknown, level = 0): string {
  if (value == null) return 'null'
  if (typeof value === 'string') return quote(value)
  if (typeof value !== 'object') return String(value)
  const array = Array.isArray(value)
  const entries = array ? value.map(item => [undefined, item] as const) : Object.entries(value)
  if (!entries.length) return array ? '[]' : '(object) []'
  const indent = '    '.repeat(level + 1)
  return '[\n' + entries.map(([name, item]) => `${indent}${name === undefined ? '' : quote(name) + ' => '}${php(item, level + 1)},`).join('\n') + '\n' + '    '.repeat(level) + ']'
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
    const send = `send(${quote(request.method)}, ${quote(request.url)}${options ? ', ' + php(options, client ? 1 : 0) : ''});`
    lines[2] += client ? client + '\n    ->' + send : send
    return lines.join('\n')
  },
}
