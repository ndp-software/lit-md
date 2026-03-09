import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import type { DocNode, OutputFileDisplayNode } from './parser.ts'

/**
 * Resolves `output-file-display` nodes by using cached execution results (if available) or
 * executing the shell command, reading the output file, and replacing the node with a code block.
 * Updates the preceding prose summary to end with `:` (instead of `.`) when content is shown.
 * Handles empty files and command failures appropriately.
 */
export function resolveOutputFiles(nodes: DocNode[]): DocNode[] {
  const result: DocNode[] = []
  for (const node of nodes) {
    if (node.kind !== 'output-file-display') {
      result.push(node)
      continue
    }
    const content = runAndCapture(node)
    if (content !== null) {
      const prev = result[result.length - 1]
      if (content.trim()) {
        // File has content: add code block, change period to colon in preceding prose
        if (prev?.kind === 'prose' && prev.text.endsWith('.')) {
          result[result.length - 1] = { ...prev, text: prev.text.slice(0, -1) + ':', noBlankAfter: true }
        }
        result.push({ kind: 'code', lang: node.lang, text: content.trimEnd() })
      } else {
        // File is empty: replace period or colon with " is empty."
        if (prev?.kind === 'prose' && (prev.text.endsWith(':') || prev.text.endsWith('.'))) {
          result[result.length - 1] = { ...prev, text: prev.text.slice(0, -1) + ' is empty.' }
        }
      }
    }
    // If content is null (command failed), silently drop the display node
  }
  return result
}

function runAndCapture(node: OutputFileDisplayNode): string | null {
  // Use cached execution if available
  if (node.execution) {
    if (node.execution.exitCode !== 0) return null
    const content = node.execution.outputFiles.get(node.path)
    return content ?? null
  }

  // Fall back to direct execution if no cache
  const tmpDir = mkdtempSync(join(tmpdir(), 'lit-md-cap-'))
  try {
    for (const f of node.inputFiles) {
      writeFileSync(join(tmpDir, f.path), f.content, 'utf8')
    }
    const result = spawnSync(node.cmd, { shell: true, encoding: 'utf8', cwd: tmpDir })
    if (result.status !== 0) return null
    try {
      return readFileSync(join(tmpDir, node.path), 'utf8')
    } catch {
      return null
    }
  } finally {
    rmSync(tmpDir, { recursive: true, force: true })
  }
}
