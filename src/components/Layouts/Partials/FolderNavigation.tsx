import {useEffect, useState} from 'react'
import {Collapsible} from '@/components/UI/Collapsible'
import {ChevronDownIcon, ChevronRightIcon} from '@/components/Icons'
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
      ? <ChevronDownIcon variant="solid" className="size-4 shrink-0 opacity-50" />
      : <ChevronRightIcon className="size-4 shrink-0 opacity-50" />} />} />
    {isOpened && <div className="pl-3">
      {navigation.children.map(item => <Navigation key={item.id} navigation={item} selectedId={selectedId} onNavigate={onNavigate} />)}
    </div>}
  </Collapsible.Root>
}
