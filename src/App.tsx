import HelloWorld from '@/components/HelloWorld'
import ComparisonCanvas from '@/components/ComparisonCanvas'

export default function App() {
  const query = new URLSearchParams(window.location.search)
  return query.get('view') === 'compare' ? <ComparisonCanvas /> : <HelloWorld specUrl={query.get('spec') || undefined} />
}
