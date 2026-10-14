import Fuse from 'fuse.js'
import type {Document} from '../OpenApi/types'
import {getOperationTitle, type InlineOperation} from '../OpenApi/utils'
import type {parseGuides} from '../../guides'

export type SearchEntry = {
  id: string,
  title: string,
  kind: 'Overview' | 'Operation' | 'Webhook' | 'Guide' | 'Schema',
  detail: string,
  content: string,
  tags?: string[],
  method?: string,
}

export function buildSearchEntries(document: Document, operations: InlineOperation[], webhooks: InlineOperation[], guides: ReturnType<typeof parseGuides>, showSchemas: boolean): SearchEntry[] {
  const tags = new Map((document.tags ?? []).map(tag => [tag.name, tag]))
  function tagLabels(names: string[]) {
    const labels = new Set<string>()
    for (const name of names) {
      let current: string | undefined = name
      const seen = new Set<string>()
      while (current && !seen.has(current)) {
        seen.add(current)
        labels.add(current)
        const tag = tags.get(current)
        if (tag?.summary) labels.add(tag.summary)
        current = tag?.parent
      }
      if (!document.openapi?.startsWith('3.2.')) {
        for (const group of document['x-tagGroups'] ?? []) {
          if (group.tags.includes(name)) labels.add(group.name)
        }
      }
    }
    return [...labels]
  }
  const operationEntries = (items: InlineOperation[], kind: 'Operation' | 'Webhook'): SearchEntry[] => items.map(item => ({
    id: item.id,
    title: getOperationTitle(item.path, item.operation),
    kind,
    detail: item.path,
    method: item.method,
    content: `${item.operation.operationId ?? ''} ${item.operation.description ?? ''}`,
    tags: tagLabels(item.operation.tags ?? []),
  }))
  return [
    {id: 'overview', title: 'Overview', kind: 'Overview', detail: document.info?.title ?? '', content: document.info?.description ?? ''},
    ...guides.map(guide => ({id: guide.id, title: guide.title, kind: 'Guide' as const, detail: guide.group ?? 'Introduction', content: guide.content})),
    ...operationEntries(operations, 'Operation'),
    ...operationEntries(webhooks, 'Webhook'),
    ...(showSchemas ? Object.entries(document.components?.schemas ?? {}).map(([name, schema]) => ({
      id: `schemas/${encodeURIComponent(name)}`, title: name, kind: 'Schema' as const,
      detail: schema.title ?? 'Schema', content: `${schema.description ?? ''} ${Object.keys(schema.properties ?? {}).join(' ')}`,
    })) : []),
  ]
}

export function createSearchIndex(entries: SearchEntry[]) {
  return new Fuse(entries, {
    threshold: 0.35,
    ignoreLocation: true,
    keys: [
      {name: 'title', weight: 3},
      {name: 'detail', weight: 2},
      {name: 'tags', weight: 2},
      'method', 'kind', 'content',
    ],
  })
}

export function searchEntries(index: Fuse<SearchEntry>, query: string): SearchEntry[] {
  const terms = query.trim().toLowerCase().split(/\s+/)
  const titleMatch = (item: SearchEntry) => terms.every(term => item.title.toLowerCase().includes(term))
  // Keep Fuse's order within each tier, but prefer complete title matches
  // over partial matches boosted by descriptions or other metadata.
  return index.search(query.trim())
    .sort((a, b) => Number(titleMatch(b.item)) - Number(titleMatch(a.item)))
    .slice(0, 50)
    .map(result => result.item)
}
