import type {Components, Document, MediaType, Parameter, Reference, Schema} from '../types'
import {resolveExampleSchema} from '../schemaExamples'
import {isSchemaVisible} from '../schemaUsage'
import {requestParameters} from './parameters'
import {formatMediaExample, getMediaExample} from '../mediaExamples'
import {createFormFields, isFormContentType} from '../formExamples'
import {bashSender} from './bash'
import {laravelSender} from './laravel'
import type {RequestExample, RequestExampleSender} from './types'

export type {RequestExample, RequestExampleSender} from './types'
export const requestExampleSenders: RequestExampleSender[] = [bashSender, laravelSender]

const fileExtensions: Record<string, string> = {'application/pdf': 'pdf', 'image/png': 'png', 'image/jpeg': 'jpg', 'text/plain': 'txt'}
const fileName = (type: string) => 'example.' + (fileExtensions[type.split(';')[0].trim().toLowerCase()] ?? 'bin')
const isBinary = (schema: Schema | undefined): boolean => !!schema && (schema.format === 'binary' || !!schema.allOf?.some(isBinary) || isBinary((schema.oneOf ?? schema.anyOf)?.find(member => member.type !== 'null')))

export function createRequestExample(base: string, path: string, method: string, contentType: string, media: MediaType | undefined, components: Components, document: Document = {components}, parameters: (Parameter | Reference)[] = []): RequestExample {
  const inputs = requestParameters(path, parameters, document)
  const url = `${base.replace(/\/$/, '')}/${inputs.path.replace(/^\//, '')}${inputs.query ? '?' + inputs.query : ''}`
  const schema = resolveExampleSchema(media?.schema, components, document)
  const type = contentType.split(';')[0].trim().toLowerCase()
  const bodyFile = media && type !== 'multipart/form-data' && (isBinary(schema) || type === 'application/octet-stream') ? fileName(type) : undefined
  const formFiles: [string, string][] = []
  function withoutFiles(current: Schema): Schema {
    const properties = current.properties && Object.fromEntries(Object.entries(current.properties).filter(([name, property]) => {
      if (!isSchemaVisible(property, 'request')) return true
      const array = property.type === 'array' && isBinary(property.items)
      if (!isBinary(property) && !array) return true
      const count = array ? Math.max(property.minItems ?? 0, Math.min(1, property.maxItems ?? Infinity)) : 1
      if (count > 100 || count > (property.maxItems ?? Infinity)) throw new Error('Cannot generate file placeholders within these array limits.')
      if (!formFiles.some(([field]) => field === name)) for (let i = 0; i < count; i++) {
        const filename = fileName(media?.encoding?.[name]?.contentType ?? '')
        formFiles.push([name, count > 1 ? filename.replace('.', `-${i + 1}.`) : filename])
      }
      return false
    }))
    return {...current, properties, allOf: current.allOf?.map(withoutFiles)}
  }
  if (type === 'multipart/form-data' && schema) media = {...media, schema: withoutFiles(schema)}
  if (bodyFile) return {
    url,
    headers: inputs.headers, method: method.toUpperCase(), contentType, body: '', value: undefined, formFields: [], bodyFile,
  }
  const value = getMediaExample(media, components, true, document, undefined, 'request')
  return {
    url,
    headers: inputs.headers,
    method: method.toUpperCase(),
    contentType: media ? contentType : '',
    body: isFormContentType(contentType) && typeof value === 'string' ? value : formatMediaExample(media, contentType, components, true, document, undefined, 'request'),
    value,
    formFields: createFormFields(media, components, document).filter(([name]) => !formFiles.some(([file]) => file === name)),
    formFiles,
  }
}
