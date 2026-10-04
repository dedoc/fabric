<script setup lang="ts">
import {computed} from "vue";
import markdownit from 'markdown-it'

const props = defineProps<{
  content: string,
}>()

const md = markdownit({
  html: true,
  linkify: true,
})

var defaultRender = md.renderer.rules.link_open || function (tokens, idx, options, env, self) {
  return self.renderToken(tokens, idx, options);
};

md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
  // Add a new `target` attribute, or replace the value of the existing one.
  tokens[idx].attrSet('target', '_blank');

  // Pass the token to the default renderer.
  return defaultRender(tokens, idx, options, env, self);
};

const renderedContent = computed(() => md.render(props.content))
</script>

<template>
<div class="prose prose-gray" v-html="renderedContent"></div>
</template>
