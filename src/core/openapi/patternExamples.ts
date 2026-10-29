/** Generate a bounded sample without executing document-provided regular expressions. */
export function createPatternExample(pattern: string, seed = 0): string {
  let position = 0
  const fail = (): never => { throw new Error('Cannot generate this pattern. Supply an example.') }
  if (pattern.length > 1024) fail()
  const escaped = (character: string | undefined): string => {
    if (character === 'd') return String(seed % 10)
    if (character === 'w') return String.fromCharCode(97 + seed % 26)
    if (character === 's') return ' '
    if (character && /[^a-zA-Z0-9]/.test(character)) return character
    return fail()
  }
  function expression(depth: number): string {
    if (depth > 16) fail()
    const alternatives: string[] = []
    let value = ''
    while (position < pattern.length && pattern[position] !== ')') {
      let atom = pattern[position++]
      if (atom === '|') { alternatives.push(value); value = ''; continue }
      if (atom === '^' && position === 1 || atom === '$' && position === pattern.length) continue
      if (atom === '(') {
        if (pattern.slice(position, position + 2) === '?:') position += 2
        else if (pattern[position] === '?') fail()
        atom = expression(depth + 1)
        if (pattern[position++] !== ')') fail()
      } else if (atom === '[') {
        if (pattern[position] === '^') fail()
        const characters: string[] = []
        while (position < pattern.length && pattern[position] !== ']') {
          const first = pattern[position++]
          if (first === '\\') { characters.push(escaped(pattern[position++])); continue }
          if (pattern[position] === '-' && pattern[position + 1] !== ']') {
            position++
            const last = pattern[position++]
            if (!last || first.charCodeAt(0) > last.charCodeAt(0) || last.charCodeAt(0) - first.charCodeAt(0) > 128) fail()
            for (let code = first.charCodeAt(0); code <= last.charCodeAt(0); code++) characters.push(String.fromCharCode(code))
          } else characters.push(first)
        }
        if (pattern[position++] !== ']' || !characters.length) fail()
        atom = characters[seed % characters.length]
      } else if (atom === '\\') atom = escaped(pattern[position++])
      else if (atom === '.') atom = 'a'
      else if ('^$?+*{}'.includes(atom)) fail()

      const quantifier = pattern.slice(position).match(/^(?:[?+*]|\{(\d+)(?:,(\d*))?\})/)
      if (quantifier) {
        position += quantifier[0].length
        const count = quantifier[1] === undefined ? 1 : Number(quantifier[1])
        if (quantifier[2] && Number(quantifier[2]) < count || count > 4096 || atom.length * count > 4096) fail()
        atom = atom.repeat(count)
        if (pattern[position] === '?') position++ // Lazy quantifiers change matching, not valid values.
      }
      value += atom
      if (value.length > 4096) fail()
    }
    alternatives.push(value)
    return alternatives[seed % alternatives.length]
  }
  const value = expression(0)
  if (position !== pattern.length) fail()
  return value
}
