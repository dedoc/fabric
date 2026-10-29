import type {HTMLAttributes} from 'react'
import {useTheme} from '@/utils/theme'
import {renderDescription} from '@/core/openapi/descriptionHtml'

export default function Description({content, className, ...attrs}: {content: string} & HTMLAttributes<HTMLDivElement>) {
  const theme = useTheme()
  return <div {...attrs} className={['prose', className].filter(Boolean).join(' ')} dangerouslySetInnerHTML={{__html: renderDescription(content, theme)}} />
}
