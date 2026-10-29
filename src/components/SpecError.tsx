import Button from '@/components/UI/Button'

export default function SpecError({message, onRetry}: {message: string, onRetry: () => void}) {
  return <main className="grid min-h-dvh place-items-center px-6 py-12">
    <div className="w-full max-w-sm space-y-4" role="alert">
      <p className="text-sm text-gray-500 dark:text-gray-400">API reference</p>
      <h1 className="text-balance text-2xl font-medium tracking-tight text-gray-900 dark:text-gray-100">Unable to display this API</h1>
      <p className="text-pretty text-sm leading-normal text-gray-600 dark:text-gray-400">{message}</p>
      <Button className="min-h-10 rounded-[--radius] border border-gray-950/10 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 hover:dark:bg-gray-900" onClick={onRetry}>Try again</Button>
    </div>
  </main>
}
