export function extractFlagArg(args: string[], flag: string): boolean {
  const idx = args.indexOf(flag)
  if (idx === -1) return false
  args.splice(idx, 1)
  return true
}

export function extractArgValue(args: string[], name: string): string | undefined {
  const idx = args.indexOf(name)
  if (idx === -1) {
    // Check for --flag=value format
    const eqIdx = args.findIndex(arg => arg.startsWith(name + '='))
    if (eqIdx === -1) return undefined
    const value = args[eqIdx]!.slice(name.length + 1)
    args.splice(eqIdx, 1)
    return value
  }
  const value = args[idx + 1]
  args.splice(idx, 2)
  return value
}