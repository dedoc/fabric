export interface RequestQueryPart {
  pairs: string[]
  native?: [string, unknown]
  repeated?: boolean
  delimited?: {name: string, items: string[], separator: ',' | ' ' | '|'}
}

export interface RequestExample {
  url: string
  query?: {url: string, parts: RequestQueryPart[]}
  method: string
  contentType: string
  body: string
  value: unknown
  formFields: [string, string][]
  headers?: [string, string][]
  bodyFile?: string
  formFiles?: [string, string][]
}

/** Implement and register a sender to expose it in the request example picker. */
export interface RequestExampleSender {
  id: string
  label: string
  generate(request: RequestExample): string
}
