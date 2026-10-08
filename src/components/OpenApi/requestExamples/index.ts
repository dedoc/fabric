import type {Components, Document, MediaType} from '../types'
import {formatMediaExample, getMediaExample} from '../mediaExamples'
import {createFormFields, isFormContentType} from '../formExamples'
import {bashSender} from './bash'
import {laravelSender} from './laravel'
import type {RequestExample, RequestExampleSender} from './types'

export type {RequestExample, RequestExampleSender} from './types'
export const requestExampleSenders: RequestExampleSender[] = [bashSender, laravelSender]

export function createRequestExample(base: string, path: string, method: string, contentType: string, media: MediaType | undefined, components: Components, document: Document = {components}): RequestExample {
  const value = getMediaExample(media, components, true, document)
  return {
    url: `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`,
    method: method.toUpperCase(),
    contentType: media ? contentType : '',
    body: isFormContentType(contentType) && typeof value === 'string' ? value : formatMediaExample(media, contentType, components, true, document),
    value,
    formFields: createFormFields(media, components, document),
  }
}
