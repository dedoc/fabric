import type {Components, Paths as PathsType} from '@/core/openapi/types'
import PathItem from '@/components/OpenApi/PathItem'

export default function Paths({base, components, paths}: {base: string; components: Components; paths: PathsType}) {
  return <>{Object.entries(paths).map(([path, pathItem]) => <PathItem key={path} base={base} components={components} path={path} pathItem={pathItem} />)}</>
}
