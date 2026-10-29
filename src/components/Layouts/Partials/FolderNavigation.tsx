import {useEffect, useState} from 'react'
import {Collapsible} from '@base-ui/react/collapsible'
import type {FolderNavigation as FolderNavigationType, SectionNavigation} from '@/components/Layouts/Partials/types'
import Navigation from '@/components/Layouts/Partials/Navigation'
import NavigationItem from '@/components/Layouts/Partials/NavigationItem'

function isSelected(navigation: FolderNavigationType | SectionNavigation, selectedId?: string): boolean {
  return navigation.children.some(child => child.type === 'folder' || child.type === 'section'
    ? isSelected(child, selectedId)
    : child.id === selectedId)
}

export default function FolderNavigation({navigation, selectedId, onNavigate}: {navigation: FolderNavigationType, selectedId?: string, onNavigate(id: string): void}) {
  const selectedInside = isSelected(navigation, selectedId)
  const [isOpened, setIsOpened] = useState(() => selectedInside)
  useEffect(() => {
    if (selectedInside) setIsOpened(true)
  }, [selectedInside, selectedId])

  return <Collapsible.Root open={isOpened} onOpenChange={setIsOpened}>
    <Collapsible.Trigger render={<NavigationItem label={navigation.name} trailing={isOpened
      ? <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-4 shrink-0 opacity-50" aria-hidden="true"><path fillRule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" /></svg>
      : <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-4 shrink-0 opacity-50" aria-hidden="true"><path fillRule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" /></svg>} />} />
    {isOpened && <div className="pl-3">
      {navigation.children.map(item => <Navigation key={item.id} navigation={item} selectedId={selectedId} onNavigate={onNavigate} />)}
    </div>}
  </Collapsible.Root>
}
