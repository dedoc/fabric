import type {RequestExampleSender} from './types'
import {isFormContentType} from '../formExamples'

const quote = (value: string) => "'" + value.replace(/'/g, "'\\''") + "'"

export const bashSender: RequestExampleSender = {
  id: 'bash',
  label: 'Bash',
  generate(request) {
    const lines = [`curl -X ${request.method} ${quote(request.url)}`]
    for (const [name, value] of request.headers ?? []) if (!request.authorization || name.toLowerCase() !== 'authorization') lines.push(`  -H ${quote(`${name}: ${value}`)}`)
    if (request.authorization) lines.push(`  -H ${quote(`Authorization: ${request.authorization}`)}`)
    const multipart = request.contentType.split(';')[0].trim().toLowerCase() === 'multipart/form-data'
    if (request.contentType && !multipart) lines.push(`  -H ${quote('Content-Type: ' + request.contentType)}`)
    if (isFormContentType(request.contentType) && typeof request.value !== 'string') {
      for (const [name, value] of request.formFields) {
        lines.push(`  --data-urlencode ${quote(`${encodeURIComponent(name)}=${value}`)}`)
      }
    } else if (multipart) {
      for (const [name, value] of request.formFields) lines.push(`  --form-string ${quote(`${name}=${value}`)}`)
      for (const [name, filename] of request.formFiles ?? []) lines.push(`  --form ${quote(`${name}=@${filename}`)}`)
    } else if (request.bodyFile) {
      lines.push(`  --data-binary ${quote('@' + request.bodyFile)}`)
    } else if (request.body !== '') {
      lines.push(`  ${isFormContentType(request.contentType) || request.body.startsWith('@') ? '--data-raw' : '-d'} ${quote(request.body)}`)
    }
    return lines.join(' \\\n')
  },
}
