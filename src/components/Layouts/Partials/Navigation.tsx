import type {Navigation as NavigationType} from '@/components/Layouts/Partials/types'
import OperationNavigation from '@/components/Layouts/Partials/OperationNavigation'
import FolderNavigation from '@/components/Layouts/Partials/FolderNavigation'
import NavigationItem from '@/components/Layouts/Partials/NavigationItem'

export default function Navigation({navigation, selectedId, onNavigate}: {navigation: NavigationType, selectedId?: string, onNavigate(id: string): void}) {
  if (navigation.type === 'section') return <section aria-label={navigation.name} className="mt-6">
    <div className="mb-3 px-2 text-[13px] font-medium">{navigation.name}</div>
    {navigation.children.map(item => <Navigation key={item.id} navigation={item} selectedId={selectedId} onNavigate={onNavigate} />)}
  </section>

  if (navigation.type === 'guide') return <NavigationItem label={navigation.name} href={`#${navigation.id}`} active={navigation.id === selectedId} aria-current={navigation.id === selectedId ? 'page' : undefined} onClick={event => {event.preventDefault(); onNavigate(navigation.id)}} />

  if (navigation.type === 'operation') return <OperationNavigation isSelected={navigation.id === selectedId} navigation={navigation} onNavigate={onNavigate} />

  return <FolderNavigation navigation={navigation} selectedId={selectedId} onNavigate={onNavigate} />
}
