export type CalloutType = 'note' | 'tip' | 'important' | 'warning' | 'caution'

// Lucide icons: https://lucide.dev (ISC licensed).
export const calloutIconPaths: Record<CalloutType, string> = {
  note: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  tip: '<path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14a6 6 0 1 0-6.18 0c.62.61 1.09 1.5 1.09 2h4c0-.5.47-1.39 1.09-2"/>',
  important: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
  warning: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  caution: '<path d="M12 16h.01"/><path d="M12 8v4"/><path d="M15.312 2a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586l-4.688-4.688A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2z"/>',
}

export function renderCalloutIcon(type: string): string {
  return `<svg class="markdown-callout-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${calloutIconPaths[type as CalloutType]}</svg>`
}
