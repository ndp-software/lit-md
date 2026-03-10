/**
 * Error context utilities for displaying source file location information
 * in error messages, helping users track down where errors originate.
 */

export type SourceLocation = {
  filePath: string
  line: number
  column: number
}

/**
 * Calculate line and column number from a character position in source text.
 * @param source The full source text
 * @param position Character position (0-indexed)
 * @returns Object with line (1-indexed) and column (0-indexed from line start)
 */
export function getLineAndColumn(source: string, position: number): { line: number; column: number } {
  let line = 1
  let column = 0
  
  for (let i = 0; i < position && i < source.length; i++) {
    if (source[i] === '\n') {
      line++
      column = 0
    } else {
      column++
    }
  }
  
  return { line, column }
}

/**
 * Extract a snippet of source code around a given position.
 * @param source The full source text
 * @param position Character position (0-indexed)
 * @param contextLines Number of lines to show before and after (default: 1)
 * @returns Array of source lines with line numbers, marking the error line
 */
export function getSourceSnippet(
  source: string,
  position: number,
  contextLines = 1
): Array<{ lineNum: number; isError: boolean; text: string }> {
  const lines = source.split('\n')
  const { line: errorLine, column: errorColumn } = getLineAndColumn(source, position)
  
  const startLine = Math.max(0, errorLine - 1 - contextLines)
  const endLine = Math.min(lines.length, errorLine + contextLines)
  
  const result: Array<{ lineNum: number; isError: boolean; text: string }> = []
  
  for (let i = startLine; i < endLine; i++) {
    result.push({
      lineNum: i + 1,
      isError: i + 1 === errorLine,
      text: lines[i] ?? ''
    })
  }
  
  return result
}

/**
 * Format source location for display in error messages.
 * @param location Source location with file path
 * @param sourceText The source file text for extracting code snippet
 * @param charPosition Character position of the error
 * @returns Formatted error header with file, line, column and code snippet
 */
export function formatSourceLocation(location: SourceLocation, sourceText: string, charPosition?: number): string {
  const { filePath, line, column } = location
  const header = `at ${filePath}:${line}:${column}`
  
  if (!charPosition) {
    return header
  }
  
  const snippet = getSourceSnippet(sourceText, charPosition, 1)
  if (snippet.length === 0) {
    return header
  }
  
  const lines: string[] = [header, '']
  
  const maxLineNum = Math.max(...snippet.map(s => s.lineNum))
  const lineNumWidth = String(maxLineNum).length
  
  for (const { lineNum, isError, text } of snippet) {
    const lineNumStr = String(lineNum).padStart(lineNumWidth, ' ')
    const prefix = isError ? '> ' : '  '
    const caret = isError ? `${' '.repeat(column + lineNumWidth + 4)}^` : ''
    
    lines.push(`${prefix}${lineNumStr}. ${text}`)
    if (caret) lines.push(caret)
  }
  
  return lines.join('\n')
}

/**
 * Enhanced error class for shell example failures that includes source location.
 */
export class ShellExampleError extends Error {
  readonly location?: SourceLocation
  readonly charPosition?: number
  readonly sourceText?: string

  constructor(
    message: string,
    location?: SourceLocation,
    charPosition?: number,
    sourceText?: string
  ) {
    super(message)
    this.name = 'ShellExampleError'
    this.location = location
    this.charPosition = charPosition
    // Make sourceText non-enumerable so it doesn't show in error output
    Object.defineProperty(this, 'sourceText', {
      value: sourceText,
      enumerable: false
    })
  }

  toString(): string {
    let result = `${this.name}: ${this.message}`
    
    if (this.location && this.sourceText) {
      result += '\n' + formatSourceLocation(this.location, this.sourceText, this.charPosition)
    }
    
    return result
  }
}
