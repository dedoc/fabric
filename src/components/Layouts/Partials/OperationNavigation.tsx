import MethodChip from '@/components/OpenApi/Partials/MethodChip'
import type {OperationNavigation as OperationNavigationType} from '@/components/Layouts/Partials/types'
import NavigationItem from '@/components/Layouts/Partials/NavigationItem'
import {WebhookIcon} from '@/components/Icons'

export default function OperationNavigation({isSelected, navigation, onNavigate}: {isSelected: boolean, navigation: OperationNavigationType, onNavigate(id: string): void}) {
  return <NavigationItem label={navigation.name} active={isSelected} alignment="baseline" aria-current={isSelected ? 'page' : undefined} onClick={() => onNavigate(navigation.id)} trailing={<MethodChip className="flex shrink-0 items-baseline gap-1.5 text-xs !text-gray-400" method={navigation.method}>{navigation.webhook && <WebhookIcon className="size-3.5 shrink-0 self-center" />}</MethodChip>} />
}
