import type {Document, Parameter, Reference} from './types'
import {resolveReference} from './references'
import type {ReferenceIssue} from './references'

/** Operations replace inherited parameters by the case-sensitive (name, in) pair. */
export function effectiveParameters(
  inherited: (Parameter | Reference)[] = [],
  own: (Parameter | Reference)[] = [],
  document: Document,
  report?: (issue: ReferenceIssue) => void,
): (Parameter | Reference)[] {
  const parameters: (Parameter | Reference)[] = []
  const indices = new Map<string, number>()
  for (const entry of [...inherited, ...own]) {
    const result = resolveReference<Parameter>(document, entry)
    result.issues.forEach(issue => report?.(issue))
    const parameter = result.value
    if (!parameter) {
      // Keep unresolved entries so parameter sections can display their diagnostics.
      parameters.push(entry)
      continue
    }
    const key = JSON.stringify([parameter.name, parameter.in])
    const index = indices.get(key)
    if (index === undefined) {
      indices.set(key, parameters.length)
      parameters.push(parameter)
    } else parameters[index] = parameter
  }
  return parameters
}
