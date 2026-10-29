import clsx from 'clsx'

type ClassName<State> = string | ((state: State) => string | undefined) | undefined

export function mergeClassName(className: string | undefined, defaults?: string): string
export function mergeClassName<State>(className: (state: State) => string | undefined, defaults?: string): (state: State) => string
export function mergeClassName<State>(className: ClassName<State>, defaults?: string): ClassName<State>
export function mergeClassName<State>(className: ClassName<State>, defaults?: string): ClassName<State> {
  if (typeof className === 'function') return state => clsx(defaults, className(state))
  return clsx(defaults, className)
}
