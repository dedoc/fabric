import type {FabricOptions} from '../types'
import auth from './guides/auth.md?raw'
import pagination from './guides/pagination.md?raw'
import errors from './guides/errors.md?raw'
import projects from './guides/projects.md?raw'

// value is the URL to load; openApiDocumentUrl preserves the upstream base for proxies.
export type PlaygroundSpec = FabricOptions & {value: string, label: string}

export const galaxySpecUrl = 'https://registry.scalar.com/@scalar/apis/galaxy?format=json'

export const fabricOptions: PlaygroundSpec[] = [
  {
    value: '/specs/fabric-reference.yaml',
    label: 'Fabric Reference Lab · OpenAPI 3.1',
    openApiDocumentUrl: '/specs/fabric-reference.yaml',
    logo: {
      title: 'Fabric Reference Lab',
      image: {src: '/fabric-logo-light.svg', srcDark: '/fabric-logo-dark.svg', alt: '', height: 24},
    },
    guides: {auth, pagination, errors, projects},
  },
  {
    value: '/specs/nav-section-preview.yaml',
    label: 'Navigation sections · OpenAPI 3.2',
    openApiDocumentUrl: '/specs/nav-section-preview.yaml',
    referenceLabel: false,
  },
  {value: '/specs/fabric-reference-3.0.yaml', label: 'Nullable Lab · OpenAPI 3.0', openApiDocumentUrl: '/specs/fabric-reference-3.0.yaml'},
  {value: '/specs/redocly-petstore.yaml', label: 'Redocly Petstore', openApiDocumentUrl: 'https://raw.githubusercontent.com/Redocly/redoc/v2.0.0-rc.1/demo/openapi.yaml'},
  {value: '/spotify/open-api-schema.yaml', label: 'Spotify · development proxy', openApiDocumentUrl: 'https://developer.spotify.com/reference/web-api/open-api-schema.yaml'},
  {value: '/converterer/openapi.json', label: 'Converterer · development proxy', openApiDocumentUrl: 'https://api.converterer.com/openapi.json'},
  {value: 'https://raw.githubusercontent.com/Redocly/redoc/v2.0.0-rc.1/demo/openapi.yaml', label: 'Redocly Petstore · v2 demo upstream', openApiDocumentUrl: 'https://raw.githubusercontent.com/Redocly/redoc/v2.0.0-rc.1/demo/openapi.yaml'},
  {value: 'https://raw.githubusercontent.com/Redocly/redoc/main/demo/openapi.yaml', label: 'Redocly Petstore · main upstream', openApiDocumentUrl: 'https://raw.githubusercontent.com/Redocly/redoc/main/demo/openapi.yaml'},
  {value: 'https://api.savvycal.com/v1/spec', label: 'SavvyCal', openApiDocumentUrl: 'https://api.savvycal.com/v1/spec'},
  {value: galaxySpecUrl, label: 'Scalar Galaxy', openApiDocumentUrl: galaxySpecUrl},
  {value: 'https://raw.githubusercontent.com/SpaceTradersAPI/api-docs/main/reference/SpaceTraders.json', label: 'SpaceTraders', openApiDocumentUrl: 'https://raw.githubusercontent.com/SpaceTradersAPI/api-docs/main/reference/SpaceTraders.json'},
  {value: 'https://petstore3.swagger.io/api/v3/openapi.json', label: 'Swagger Petstore', openApiDocumentUrl: 'https://petstore3.swagger.io/api/v3/openapi.json'},
  {value: 'https://raw.githubusercontent.com/github/rest-api-description/main/descriptions/api.github.com/api.github.com.json', label: 'GitHub REST API', openApiDocumentUrl: 'https://raw.githubusercontent.com/github/rest-api-description/main/descriptions/api.github.com/api.github.com.json'},
  {value: 'https://raw.githubusercontent.com/stripe/openapi/master/openapi/spec3.json', label: 'Stripe', openApiDocumentUrl: 'https://raw.githubusercontent.com/stripe/openapi/master/openapi/spec3.json'},
  {value: 'https://raw.githubusercontent.com/box/box-openapi/main/openapi.json', label: 'Box', openApiDocumentUrl: 'https://raw.githubusercontent.com/box/box-openapi/main/openapi.json'},
  {value: 'http://demo-scramble-pro.test/docs/api.json', label: 'Scramble Pro · local', openApiDocumentUrl: 'http://demo-scramble-pro.test/docs/api.json'},
  {value: '/docs/api.json', label: 'Local API · development proxy', openApiDocumentUrl: '/docs/api.json'},
  {value: 'http://l12app.test/docs/api.json', label: 'l12app · local', openApiDocumentUrl: 'http://l12app.test/docs/api.json'},
  {value: 'http://reproduction.test/docs/api.json', label: 'Reproduction · local', openApiDocumentUrl: 'http://reproduction.test/docs/api.json'},
  {value: 'http://l12.test/docs/api.json', label: 'l12 · local', openApiDocumentUrl: 'http://l12.test/docs/api.json'},
]
