import {useEffect, useState} from 'react'
import type {Document} from '@/core/openapi/types'
import type {LogoConfig} from '@/types'
import {useTheme} from '@/utils/theme'

export default function ApiBrand({info, documentUrl, logo, homeHref = '#overview'}: {info?: Document['info']; documentUrl?: string; logo?: LogoConfig | false; homeHref?: string | false}) {
  const theme = useTheme()
  const [failed, setFailed] = useState(false)
  const configured = logo !== undefined
  const config = logo || undefined
  const specLogo = info?.['x-logo']
  function safeUrl(value?: string, base = documentUrl): string | undefined {
    if (typeof value !== 'string' || !value.trim()) return undefined
    try { const url = new URL(value, base); return ['http:', 'https:'].includes(url.protocol) ? url.href : undefined } catch { return undefined }
  }
  const hostUrl = typeof window !== 'undefined' ? window.location.href : undefined
  const source = !configured ? safeUrl(specLogo?.url) : safeUrl(theme === 'dark' ? config?.image?.srcDark ?? config?.image?.src : config?.image?.src, hostUrl)
  const showImage = !!source && !failed
  const visibleTitle = configured && !config?.image ? config?.title || info?.title : showImage ? config?.title : config?.title || info?.title
  const alt = configured ? config?.image?.alt ?? info?.title ?? '' : specLogo?.altText ?? 'logo'
  const imageHeight = config?.image?.height
  const height = typeof imageHeight === 'number' && Number.isFinite(imageHeight) && imageHeight > 0 ? imageHeight : 36
  const href = !configured ? safeUrl(specLogo?.href ?? info?.contact?.url) : config?.href === false ? undefined : config?.href === undefined ? homeHref || undefined : safeUrl(config.href, hostUrl)
  const target = href ? configured ? config?.target ?? '_self' : '_blank' : undefined
  const color = !configured ? specLogo?.backgroundColor : undefined
  const backgroundColor = typeof color === 'string' && /^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(color) ? color : undefined
  useEffect(() => setFailed(false), [source, info, logo])
  if (logo === false) return <div className="min-w-0 flex-1 md:w-full md:flex-none" />
  const content = <>{showImage && <img key={source} src={source} alt={visibleTitle ? alt : alt || info?.title} style={{height: `${height}px`}} className="block min-w-0 max-w-full shrink object-contain object-left" onError={() => setFailed(true)} />}{visibleTitle && <span className="min-w-0 line-clamp-2 text-base font-semibold leading-tight md:text-lg md:leading-tight">{visibleTitle}</span>}</>
  return <div className="min-w-0 flex-1 md:w-full md:flex-none"><>{href && (configured || showImage) ? <a href={href} target={target} rel={target === '_blank' ? 'noopener noreferrer' : undefined} className={`flex w-fit max-w-full items-center gap-2 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500 ${!configured && showImage ? 'dark:bg-white dark:px-2' : ''}`} style={{backgroundColor}}>{content}</a> : <div className={`flex w-fit max-w-full items-center gap-2 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500 ${!configured && showImage ? 'dark:bg-white dark:px-2' : ''}`} style={{backgroundColor}}>{content}</div>}</></div>
}
