Planned Fabric API

## Init the spec
```ts
Fabric.init(options: FabricRootOptions);

type FabricRootOptions = FabricOptions

type FabricOptions = {
	openApiDocument: string | () => Promise<string>,
	schemas: bool,
	logo: { title: string } | { image: string, alt: string } | false,
}
```

```js
Fabric.init({
	openApiDocument: string(json or yaml) | url (will be fetched) | async function that returns string (yaml json),
});
```

## More spec options
```js
Fabric.init({
	openApiDocument: string(json or yaml) | url (will be fetched) | async function that returns string (yaml json),
	schemas: false, // enable or disable schemas section. when disabled, references to schema objects across documentation are rendered as text, not as links to schema pages
	logo: { title: string } | { image: string, alt: string } | false,  
});
```

## Multiple API versions or specs
```js
Fabric.init({
	specs: (FabricOptions & { name: string, slug: string, order: number })[],
	defaultSpec: string,
	logo: { title: string } | { image: string, alt: string } | false,  
});
```

## Guides
```js
Fabric.init({
	openApiDocument: spec,
	guides: {
		auth: string (md with frontmatter),
		'rate-limits': string,
	},
})
```

Guide itself is a markdown with frontmatter:

Frontmatter include

```
title: Authentication
order: 1
```

When you want to use guide in some docs group, just:
```
title: Events
group: events
```





