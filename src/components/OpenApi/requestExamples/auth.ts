/** Encode UTF-8 credentials, including the separator for an empty password. */
export function basicAuthorization(username: string, password: string): string {
  const bytes = new TextEncoder().encode(`${username}:${password}`)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return `Basic ${btoa(binary)}`
}

// Used only in the display model; copied code is generated separately.
export const authPlaceholder = '__FABRIC_AUTH_CREDENTIALS__'
