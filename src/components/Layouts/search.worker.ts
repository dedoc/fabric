import {createSearchIndex, searchEntries, type SearchEntry} from './search'

export type SearchRequest = {entries: SearchEntry[]} | {id: number, query: string}
export type SearchResponse = {id: number, entries: SearchEntry[]}

let index = createSearchIndex([])
self.onmessage = (event: MessageEvent<SearchRequest>) => {
  const request = event.data
  if ('entries' in request) {
    index = createSearchIndex(request.entries)
  } else {
    const response: SearchResponse = {id: request.id, entries: searchEntries(index, request.query)}
    self.postMessage(response)
  }
}
