---
title: Authentication
order: 1
---
Use the security requirements shown on each endpoint to choose how to authenticate.
The Fabric Reference Lab is an illustrative API; the credentials below are placeholders.

## Send a bearer token

Include your token in the `Authorization` header:

```http
GET /v1/projects/project-1 HTTP/1.1
Host: reference.example.com
Authorization: Bearer <token>
```

Keep tokens on your server or in secure storage. Replace `<token>` with your own
credential when working with a real API, and avoid committing credentials to source control.

## Check endpoint requirements

Some endpoints require an API key or a particular OAuth scope. Check the endpoint's
authentication section before making a request. A `401` response means you need to
check your credentials; a `403` response means the request was refused because of permissions.
