const query = new URLSearchParams(window.location.search)
const renderer = query.get('renderer')
const spec = new URL(query.get('spec') || '/specs/fabric-reference.yaml', window.location.href)
const status = document.getElementById('status')
const container = document.getElementById('renderer')

function asset(tag, url, module = false) {
  return new Promise((resolve, reject) => {
    const element = document.createElement(tag)
    const timeout = setTimeout(() => reject(new Error('Renderer download timed out. Check your connection and retry.')), 30000)
    element.onload = () => { clearTimeout(timeout); resolve() }
    element.onerror = () => { clearTimeout(timeout); reject(new Error('Unable to download the renderer. Check your connection and retry.')) }
    if (tag === 'link') { element.rel = 'stylesheet'; element.href = url }
    else { element.src = url; if (module) element.type = 'module' }
    document.head.append(element)
  })
}

async function start() {
  if (!['http:', 'https:'].includes(spec.protocol)) throw new Error('The specification must use an HTTP or HTTPS URL.')
  if (!['elements', 'redoc', 'redoc3', 'swagger', 'scalar', 'rapidoc', 'explorer'].includes(renderer)) throw new Error('Unknown OpenAPI renderer.')
  // Check the source locally before allowing the renderer to parse it.
  const response = await fetch(spec, {signal: AbortSignal.timeout(30000)})
  if (!response.ok) throw new Error(`Unable to load the specification (HTTP ${response.status}).`)
  if (renderer === 'elements') {
    await Promise.all([
      asset('link', 'https://cdn.jsdelivr.net/npm/@stoplight/elements@9/styles.min.css'),
      asset('script', 'https://cdn.jsdelivr.net/npm/@stoplight/elements@9/web-components.min.js'),
    ])
    const element = document.createElement('elements-api')
    element.setAttribute('apiDescriptionUrl', spec.href)
    element.setAttribute('router', 'hash')
    element.setAttribute('layout', 'sidebar')
    container.append(element)
  } else if (renderer === 'redoc') {
    await asset('script', 'https://cdn.jsdelivr.net/npm/redoc@2.5.2/bundles/redoc.standalone.js')
    await new Promise((resolve, reject) => window.Redoc.init(spec.href, {}, container, error => error ? reject(error) : resolve()))
  } else if (renderer === 'redoc3') {
    const element = document.createElement('redoc')
    element.setAttribute('spec-url', spec.href)
    container.append(element)
    await asset('script', 'https://cdn.redoc.ly/redoc/v3.0.0-rc.0/redoc.standalone.js', true)
  } else if (renderer === 'scalar') {
    await asset('script', 'https://cdn.jsdelivr.net/npm/@scalar/api-reference')
    window.Scalar.createApiReference('#renderer', {url: spec.href, proxyUrl: ''})
  } else if (renderer === 'rapidoc' || renderer === 'explorer') {
    const isRapiDoc = renderer === 'rapidoc'
    await asset('script', isRapiDoc
      ? 'https://cdn.jsdelivr.net/npm/rapidoc@9/dist/rapidoc-min.js'
      : 'https://cdn.jsdelivr.net/npm/openapi-explorer@2/dist/browser/openapi-explorer.min.js', true)
    const element = document.createElement(isRapiDoc ? 'rapi-doc' : 'openapi-explorer')
    element.setAttribute('spec-url', spec.href)
    if (isRapiDoc) {
      element.setAttribute('theme', 'light')
      element.setAttribute('render-style', 'focused')
      element.setAttribute('show-header', 'false')
    }
    container.append(element)
  } else {
    await Promise.all([
      asset('link', 'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css'),
      asset('script', 'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js'),
    ])
    window.SwaggerUIBundle({url: spec.href, domNode: container, deepLinking: true, validatorUrl: null})
  }
  status.hidden = true
}

start().catch(error => {
  status.setAttribute('role', 'alert')
  status.textContent = error instanceof Error ? error.message : 'Unable to load this renderer.'
  const retry = document.createElement('button')
  retry.textContent = 'Retry'
  retry.addEventListener('click', () => window.location.reload())
  status.append(document.createElement('br'), retry)
})
