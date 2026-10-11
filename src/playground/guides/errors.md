---
title: Errors
order: 3
---
Check both the HTTP status and the response body when a request fails.
Each endpoint's Responses section describes its supported error responses.

## Read an error response

A real API might return a structured error like this:

```json
{
  "error": {
    "code": "invalid_parameter",
    "message": "The projectId parameter is required."
  },
  "request_id": "request-123"
}
```

Use the error code for program logic and the message for context. Keep the request
ID when reporting a problem, and avoid logging credentials or sensitive payloads.

## Decide what to do next

| Status | Typical next step |
| --- | --- |
| 400 or 422 | Check the request's parameters and body. |
| 401 | Check or refresh your credentials. |
| 403 | Check the permissions required by the endpoint. |
| 404 | Check the resource identifier and endpoint URL. |
| 429 | Follow the API's retry instructions and any `Retry-After` header. |
| 5xx | Retry only when the API's contract makes the operation safe to repeat. |

These are example conventions. Follow the specific error contract of the API you use.
