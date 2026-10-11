import {parse} from 'yaml'

export function parseGuides(sources: Record<string, string> = {}) {
  return Object.entries(sources).map(([slug, source]) => {
    const frontmatter = source.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)
    const metadata = frontmatter ? parse(frontmatter[1], {maxAliasCount: 100}) : undefined
    const fields = metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata : {}
    return {
      id: `guides/${encodeURIComponent(slug)}`,
      title: typeof fields.title === 'string' && fields.title.trim() ? fields.title.trim() : slug,
      order: typeof fields.order === 'number' && Number.isFinite(fields.order) ? fields.order : Infinity,
      content: frontmatter ? source.slice(frontmatter[0].length) : source,
    }
  }).sort((a, b) => a.order - b.order)
}
