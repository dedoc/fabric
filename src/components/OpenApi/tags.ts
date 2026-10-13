import type {Document, Tag} from './types'
import type {InlineOperation} from './utils'

export type OperationTagGroup = {
  key: string,
  name: string,
  tag?: Tag,
  operations: InlineOperation[],
  children: OperationTagGroup[],
}

export function isNavigationTag(tag?: Tag): boolean {
  return !tag?.kind || tag.kind === 'nav'
}

/** Tag order orders siblings; only explicit relationships create nesting. */
export function groupOperationsByTags(document: Document, operations: InlineOperation[]): {groups: OperationTagGroup[], untagged: InlineOperation[]} {
  const tags = new Map((document.tags ?? []).map(tag => [tag.name, tag]))
  const nodes = new Map<string, OperationTagGroup>()
  for (const tag of tags.values()) {
    if (isNavigationTag(tag)) nodes.set(tag.name, {key: `tag/${tag.name}`, name: tag.summary ?? tag.name, tag, operations: [], children: []})
  }
  const untagged: InlineOperation[] = []
  for (const operation of operations) {
    const names = [...new Set(operation.operation.tags ?? [])].filter(name => isNavigationTag(tags.get(name)))
    if (!names.length) untagged.push(operation)
    for (const name of names) {
      if (!nodes.has(name)) nodes.set(name, {key: `tag/${name}`, name, operations: [], children: []})
      nodes.get(name)!.operations.push(operation)
    }
  }

  const roots: OperationTagGroup[] = []
  if (!document.openapi?.startsWith('3.2.') && document['x-tagGroups']?.length) {
    for (const [index, group] of document['x-tagGroups'].entries()) {
      roots.push({key: `tagGroup/${index}`, name: group.name, operations: [], children:
        [...new Set(group.tags)].flatMap(name => nodes.has(name) ? [nodes.get(name)!] : []),
      })
    }
  } else {
    for (const [name, node] of nodes) {
      // Broken parents and cycles in programmatic input fall back to flat tags.
      const seen = new Set([name])
      let parent = node.tag?.parent
      while (parent && nodes.has(parent) && !seen.has(parent)) {
        seen.add(parent)
        parent = nodes.get(parent)?.tag?.parent
      }
      const valid = !parent
      const parentNode = valid && node.tag?.parent ? nodes.get(node.tag.parent) : undefined
      if (parentNode) parentNode.children.push(node)
      else roots.push(node)
    }
  }

  function prune(groups: OperationTagGroup[]): OperationTagGroup[] {
    return groups.filter(group => {
      group.children = prune(group.children)
      return group.operations.length || group.children.length
    })
  }
  return {groups: prune(roots), untagged}
}

export function tagGroupOperations(group: OperationTagGroup): InlineOperation[] {
  return [...new Map([...group.operations, ...group.children.flatMap(tagGroupOperations)].map(operation => [operation.id, operation])).values()]
}
