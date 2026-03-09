import type { DocNode, CodeNode } from './parser.ts'

const langAliases: Record<string, string> = {
  typescript: 'ts',
  javascript: 'js',
}

/** Merges consecutive code blocks of the same language */
function mergeConsecutiveCodeBlocks(nodes: DocNode[]): DocNode[] {
  if (nodes.length === 0) return nodes
  
  const result: DocNode[] = []
  let currentCodeBlock: CodeNode | null = null
  
  for (const node of nodes) {
    if (node.kind === 'code') {
      if (currentCodeBlock && currentCodeBlock.lang === node.lang && !currentCodeBlock.title && !node.title) {
        // Merge with current block
        currentCodeBlock.text += '\n\n' + node.text
      } else {
        // Save previous block and start new one
        if (currentCodeBlock) result.push(currentCodeBlock)
        currentCodeBlock = { ...node }
      }
    } else {
      // Non-code node: flush current block and add this node
      if (currentCodeBlock) {
        result.push(currentCodeBlock)
        currentCodeBlock = null
      }
      result.push(node)
    }
  }
  
  // Don't forget the last code block
  if (currentCodeBlock) result.push(currentCodeBlock)
  
  return result
}

export function render(nodes: DocNode[], describeFormat: string = 'hidden'): string {
  const merged = mergeConsecutiveCodeBlocks(nodes.filter(n => n.kind !== 'output-file-display'))
  if (!merged.length) return ''
  let out = ''
  let lastHeaderLevel = 0
  for (let i = 0; i < merged.length; i++) {
    if (i > 0) {
      const prev = merged[i - 1]!
      const curr = merged[i]!
      const noBlank = (prev.kind === 'prose' && prev.noBlankAfter) ||
                      (curr.kind === 'prose' && curr.noBlankBefore)
      out += noBlank ? '\n' : '\n\n'
    }
    const rendered = renderNode(merged[i]!, describeFormat, lastHeaderLevel)
    out += rendered
    // Update lastHeaderLevel after rendering
    const node = merged[i]!
    if (node.kind === 'describe' && describeFormat !== 'hidden') {
      const baseLevel = describeFormat === 'auto' ? lastHeaderLevel : describeFormat.length
      lastHeaderLevel = baseLevel + node.depth
      lastHeaderLevel = Math.min(lastHeaderLevel, 6)
    } else if (node.kind === 'prose') {
      // Check for headers in prose and update lastHeaderLevel
      const proseHeaderLevel = getMaxHeaderLevelInProse(node.text)
      if (proseHeaderLevel > 0) {
        lastHeaderLevel = proseHeaderLevel
      }
    }
  }
  return out
}

function renderNode(node: DocNode, describeFormat: string = 'hidden', lastHeaderLevel: number = 0): string {
  if (node.kind === 'prose') return node.text
  if (node.kind === 'output-file-display') return ''
  if (node.kind === 'describe') {
    if (describeFormat === 'hidden') return ''
    let baseLevel: number
    if (describeFormat === 'auto') {
      // If no headers yet, start at h1. Otherwise, go one level deeper than last header
      baseLevel = lastHeaderLevel === 0 ? 1 : lastHeaderLevel + 1
    } else {
      // Explicit format (e.g., "#", "##", etc.)
      baseLevel = describeFormat.length > 0 ? describeFormat.length : 1
    }
    const level = baseLevel + node.depth
    const hashes = '#'.repeat(Math.min(level, 6))
    return `${hashes} ${node.name}`
  }
  const lang = langAliases[node.lang] ?? node.lang
  // Omit language if it's 'text'
  const info = lang === 'text' ? (node.title ?? '') : (node.title ? `${lang} ${node.title}` : lang)
  
  // Use dynamic fence delimiters to handle nested code blocks
  // Find the longest sequence of backticks in the content
  const maxBackticks = findMaxBacktickSequence(node.text)
  const fenceLength = Math.max(3, maxBackticks + 1)
  const fence = '`'.repeat(fenceLength)
  
  return `${fence}${info}\n${node.text}\n${fence}`
}

function findMaxBacktickSequence(text: string): number {
  let maxSeq = 0
  let currentSeq = 0
  for (const char of text) {
    if (char === '`') {
      currentSeq++
      maxSeq = Math.max(maxSeq, currentSeq)
    } else {
      currentSeq = 0
    }
  }
  return maxSeq
}

/** Detects the maximum header level in prose text (1-6) */
function getMaxHeaderLevelInProse(text: string): number {
  let maxLevel = 0
  const lines = text.split('\n')
  for (const line of lines) {
    // Match lines that start with # characters
    const match = line.match(/^(#+)\s/)
    if (match) {
      const level = match[1].length
      maxLevel = Math.max(maxLevel, Math.min(level, 6))
    }
  }
  return maxLevel
}
