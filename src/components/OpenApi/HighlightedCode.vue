<script setup lang="ts">
import {computed} from 'vue'
import {codeToTokens} from '@pierre/highlights'
import type {Lang, ThemedToken} from '@pierre/highlights'
import githubLight from '@pierre/highlights/themes/github-light'

const props = defineProps<{code: string, language: Lang, placeholder?: string}>()
const highlighted = computed(() => {
  const lines = codeToTokens(props.code, {lang: props.language, theme: githubLight}).tokens
  const tokens: ThemedToken[] = []
  let offset = 0
  for (const [index, line] of lines.entries()) {
    tokens.push(...line)
    const newline = props.code.indexOf('\n', offset)
    if (index < lines.length - 1 && newline >= 0) {
      const start = props.code[newline - 1] === '\r' ? newline - 1 : newline
      tokens.push({content: props.code.slice(start, newline + 1), offset: start})
    }
    offset = newline < 0 ? props.code.length : newline + 1
  }
  const index = props.placeholder ? props.code.indexOf(props.placeholder) : -1
  function slice(start: number, end: number) {
    return tokens.flatMap(token => {
      const content = token.content.slice(Math.max(0, start - token.offset), Math.max(0, end - token.offset))
      return content ? [{...token, content}] : []
    })
  }
  return {
    before: index < 0 ? tokens : slice(0, index),
    after: index < 0 ? [] : slice(index + props.placeholder!.length, props.code.length),
    placeholder: index >= 0,
  }
})
function style(token: ThemedToken) {
  return {color: token.color, fontStyle: (token.fontStyle ?? 0) & 1 ? 'italic' : undefined, fontWeight: (token.fontStyle ?? 0) & 2 ? 'bold' : undefined}
}
</script>

<template>
  <code class="font-jetbrains-mono"><span v-for="(token, index) in highlighted.before" :key="index" :style="style(token)">{{ token.content }}</span><slot v-if="highlighted.placeholder" /><span v-for="(token, index) in highlighted.after" :key="index" :style="style(token)">{{ token.content }}</span></code>
</template>
