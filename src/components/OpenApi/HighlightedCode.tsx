import {useMemo} from 'react'
import {codeToTokens} from '@pierre/highlights'
import type {Lang, ThemedToken} from '@pierre/highlights'
import githubLight from '@pierre/highlights/themes/github-light'
import githubDark from '@pierre/highlights/themes/github-dark'
import {useTheme} from '@/utils/theme'

export default function HighlightedCode({code, language}: {code: string, language: Lang}) {
  const theme = useTheme()
  const highlighted = useMemo(() => {
    const lines = codeToTokens(code, {lang: language, theme: theme === 'dark' ? githubDark : githubLight}).tokens
    const tokens: ThemedToken[] = []
    let offset = 0
    for (const [index, line] of lines.entries()) {
      tokens.push(...line)
      const newline = code.indexOf('\n', offset)
      if (index < lines.length - 1 && newline >= 0) {
        const start = code[newline - 1] === '\r' ? newline - 1 : newline
        tokens.push({content: code.slice(start, newline + 1), offset: start})
      }
      offset = newline < 0 ? code.length : newline + 1
    }
    return tokens
  }, [code, language, theme])

  return <code className="font-jetbrains-mono">{highlighted.map((token, index) => <span key={index} style={{color: token.color, fontStyle: (token.fontStyle ?? 0) & 1 ? 'italic' : undefined, fontWeight: (token.fontStyle ?? 0) & 2 ? 'bold' : undefined}}>{token.content}</span>)}</code>
}
