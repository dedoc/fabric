export interface RequestExample {
  url: string
  method: string
  contentType: string
  body: string
  value: unknown
  formFields: [string, string][]
  authorization?: string
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
