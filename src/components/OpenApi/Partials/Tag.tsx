import type {Tag as OpenApiTag} from '@/core/openapi/types'

export default function Tag({tag}: {tag: OpenApiTag}) {
  return <span className={`inline-flex items-center text-sm ${tag.kind === 'badge'
    ? 'rounded-full border border-[color:color-mix(in_srgb,var(--primary)_35%,transparent)] bg-[color:color-mix(in_srgb,var(--primary)_6%,transparent)] px-1.5 py-[3px] leading-[18px] text-[color:var(--primary)]'
    : 'text-gray-500 dark:text-gray-400'}`}>{tag.kind === 'audience' ? 'Audience: ' : ''}{tag.summary ?? tag.name}</span>
}
