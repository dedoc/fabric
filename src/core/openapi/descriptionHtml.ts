import MarkdownIt from 'markdown-it'
import {renderCalloutIcon} from '@/components/Icons/calloutMarkup'
import sanitizeHtml from 'sanitize-html'
import {codeToHtml, isSupportedLanguage} from '@pierre/highlights'
import githubLight from '@pierre/highlights/themes/github-light'
import githubDark from '@pierre/highlights/themes/github-dark'

const markdown = new MarkdownIt({html: true, linkify: true})

const calloutTypes = ['note', 'tip', 'important', 'warning', 'caution']

markdown.core.ruler.after('inline', 'callouts', state => {
  for (let index = 0; index < state.tokens.length; index++) {
    const token = state.tokens[index]
    if (token.type !== 'blockquote_open' || state.tokens[index + 1]?.type !== 'paragraph_open') continue
    const inline = state.tokens[index + 2]
    const first = inline?.children?.[0]
    if (inline?.type !== 'inline' || first?.type !== 'text') continue
    const marker = first.content.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\](?=\s|$)[ \t]*/)
    if (!marker) continue

    const type = marker[1].toLowerCase()
    token.attrSet('class', `markdown-callout markdown-callout-${type}`)
    token.attrSet('aria-label', type[0].toUpperCase() + type.slice(1))
    token.meta = {calloutType: type}
    first.content = first.content.slice(marker[0].length)
    if (!first.content) {
      inline.children!.shift()
      if (inline.children![0]?.type === 'softbreak') inline.children!.shift()
    }
    // A marker on its own line should not leave an empty paragraph.
    if (!inline.children!.length) state.tokens.splice(index + 1, 3)
  }
})

markdown.renderer.rules.blockquote_open = (tokens, index, options, context: RenderContext, renderer) => {
  const type = tokens[index].meta?.calloutType
  if (type) {
    const marker = `${context.markerPrefix}${context.generatedBlocks.length}`
    const html = renderCalloutIcon(type)
    context.generatedBlocks.push({marker, html})
    return renderer.renderToken(tokens, index, options) + marker
  }
  return renderer.renderToken(tokens, index, options)
}

type GeneratedBlock = {marker: string, html: string}
type RenderContext = {theme: 'light' | 'dark', markerPrefix: string, generatedBlocks: GeneratedBlock[]}

// Keep generated highlighting separate so source HTML still loses all inline styles.
const renderCode: NonNullable<typeof markdown.renderer.rules.fence> = (tokens, index, _options, context: RenderContext) => {
  const token = tokens[index]
  const language = token.info.trim().split(/\s+/)[0].toLowerCase()
  const html = new TextDecoder().decode(codeToHtml(token.content, {
    lang: isSupportedLanguage(language) ? language : 'text',
    theme: context.theme === 'dark' ? githubDark : githubLight,
  })).replace(/^<pre[^>]*>/, '<pre tabindex="0">')
  const marker = `${context.markerPrefix}${context.generatedBlocks.length}`
  context.generatedBlocks.push({marker, html})
  return marker
}
markdown.renderer.rules.fence = renderCode
markdown.renderer.rules.code_block = renderCode

export function renderDescription(content: string, theme: 'light' | 'dark' = 'light'): string {
  const context: RenderContext = {theme, markerPrefix: `FABRIC_CODE_${Math.random().toString(36).slice(2)}_`, generatedBlocks: []}
  let html = sanitizeHtml(markdown.render(content, context), {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img', 'details', 'summary'],
    allowedAttributes: {
      blockquote: ['class', 'aria-label'],
      a: ['href', 'title', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height'],
      th: ['colspan', 'rowspan', 'scope'],
      td: ['colspan', 'rowspan'],
    },
    allowedClasses: {
      blockquote: ['markdown-callout', ...calloutTypes.map(type => `markdown-callout-${type}`)],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: {img: ['http', 'https']},
    allowProtocolRelative: false,
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', {target: '_blank', rel: 'noopener noreferrer'}),
    },
  })
  for (const block of context.generatedBlocks) html = html.replace(block.marker, () => block.html)
  return html
}
