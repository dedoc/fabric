---
title: Pagination
order: 2
---
List endpoints may return a page of results rather than the entire collection.
Use the pagination parameters and response fields documented on the endpoint.

## Cursor pagination

For an API that supports cursors, the first request can look like this:

```http
GET /v1/projects?limit=20 HTTP/1.1
Host: reference.example.com
```

An illustrative response includes the next cursor:

```json
{
  "data": [{"id": "project-1", "name": "Reference Lab"}],
  "next_cursor": "page-2"
}
```

Pass that value as the next request's `cursor`. Stop when the API returns no next cursor.
Treat cursor values as opaque strings and keep your filters consistent between pages.

If you pause a long-running import, save the next cursor together with the filters
used for that request. Check the API's documentation before resuming: cursors may
expire, and a saved cursor may no longer be valid.

Records can change while you move through a collection. Check whether the API
provides a stable snapshot or ordering, and use resource identifiers to avoid
processing the same record twice when your workflow needs deduplication.

## Follow the endpoint's contract

These examples explain the pattern; they do not add pagination to the Reference Lab
specification. An API may instead use page numbers, offsets, or a next-page link.
