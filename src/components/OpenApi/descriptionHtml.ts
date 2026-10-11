import MarkdownIt from 'markdown-it'
import sanitizeHtml from 'sanitize-html'
import {codeToHtml, isSupportedLanguage} from '@pierre/highlights'
import githubLight from '@pierre/highlights/themes/github-light'
import githubDark from '@pierre/highlights/themes/github-dark'

const markdown = new MarkdownIt({html: true, linkify: true})

type CodeBlock = {marker: string, html: string}
type RenderContext = {theme: 'light' | 'dark', markerPrefix: string, codeBlocks: CodeBlock[]}

// Keep generated highlighting separate so source HTML still loses all inline styles.
const renderCode: NonNullable<typeof markdown.renderer.rules.fence> = (tokens, index, _options, context: RenderContext) => {
  const token = tokens[index]
  const language = token.info.trim().split(/\s+/)[0].toLowerCase()
  const html = new TextDecoder().decode(codeToHtml(token.content, {
    lang: isSupportedLanguage(language) ? language : 'text',
    theme: context.theme === 'dark' ? githubDark : githubLight,
  })).replace(/^<pre[^>]*>/, '<pre tabindex="0">')
  const marker = `${context.markerPrefix}${context.codeBlocks.length}`
  context.codeBlocks.push({marker, html})
  return marker
}
markdown.renderer.rules.fence = renderCode
markdown.renderer.rules.code_block = renderCode

export function renderDescription(content: string, theme: 'light' | 'dark' = 'light'): string {
  const context: RenderContext = {theme, markerPrefix: `FABRIC_CODE_${Math.random().toString(36).slice(2)}_`, codeBlocks: []}
  let html = sanitizeHtml(markdown.render(content, context), {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img', 'details', 'summary'],
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height'],
      th: ['colspan', 'rowspan', 'scope'],
      td: ['colspan', 'rowspan'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: {img: ['http', 'https']},
    allowProtocolRelative: false,
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', {target: '_blank', rel: 'noopener noreferrer'}),
    },
  })
  for (const block of context.codeBlocks) html = html.replace(block.marker, () => block.html)
  return html
}
