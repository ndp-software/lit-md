import ts from 'typescript'
import { spawnSync } from 'node:child_process'
import { writeFileSync, mkdtempSync, rmSync, readFileSync } from 'node:fs'
import { join, isAbsolute } from 'node:path'
import { tmpdir } from 'node:os'
import { buildAliasPrefix } from './shell.ts'
import { ShellExampleError, getLineAndColumn } from './error-context.ts'
import type { SourceLocation } from './error-context.ts'

export type ProseNode = { kind: 'prose'; text: string; terminal?: true; noBlankAfter?: true; noBlankBefore?: true }
export type CodeNode = { kind: 'code'; lang: string; text: string; title?: string }
export type DescribeNode = { kind: 'describe'; name: string; depth: number }

export type ShellCommandExecution = {
  stdout: string
  outputFiles: Map<string, string>
  exitCode: number
}

export type InputFileInfo = { path: string, content: string }
export type OutputFileDisplayNode = {
  kind: 'output-file-display'
  path: string
  lang: string
  cmd: string
  inputFiles: Array<InputFileInfo>
  execution?: ShellCommandExecution
}
export type DocNode = ProseNode | CodeNode | OutputFileDisplayNode | DescribeNode

export function parse(src: string, lang = 'typescript', filePath?: string): DocNode[] {
  if (!src.trim()) return []

  const sf = ts.createSourceFile('input.ts', src, ts.ScriptTarget.Latest, true)
  const nodes: DocNode[] = []
  const processedCommentRanges = new Set<number>()
  let pendingFileLabel: string | undefined = undefined
  let lastCommentEnd = 0
  let pendingNewParagraph = false

  function extractLeadingComments(pos: number): void {
    const ranges = ts.getLeadingCommentRanges(src, pos) ?? []
    for (const r of ranges) {
      if (processedCommentRanges.has(r.pos)) continue
      processedCommentRanges.add(r.pos)
      const raw = src.slice(r.pos, r.end)

      const gap = lastCommentEnd > 0 ? src.slice(lastCommentEnd, r.pos) : ''
      const hasBlankLineBefore = gap !== '' && /^[ \t\n]*$/.test(gap) && /\n[ \t]*\n/.test(gap)
      lastCommentEnd = r.end

      // Check for // file: directive first
      if (r.kind === ts.SyntaxKind.SingleLineCommentTrivia) {
        const fileMatch = raw.match(/^\/\/\s*file:\s*(.+)$/)
        if (fileMatch) {
          pendingFileLabel = fileMatch[1]!.trim()
          continue
        }
      }

      const prose = commentToProse(raw, r.kind)
      if (prose !== null) {
        if (hasBlankLineBefore && prose === '') {
          pendingNewParagraph = true
        } else if ((hasBlankLineBefore || pendingNewParagraph) && prose !== '') {
          nodes.push({ kind: 'prose', text: prose })
          pendingNewParagraph = false
        } else {
          mergeOrPushProse(nodes, prose)
        }
      }
    }
  }

  function visitStatements(statements: ts.NodeArray<ts.Statement>, depth: number = 0, parentBlock?: ts.Block): void {
    for (const stmt of statements) {
      extractLeadingComments(stmt.getFullStart())
      processStatement(stmt, depth)
    }
    
    // Extract trailing comments after the last statement
    if (statements.length > 0 && parentBlock) {
      const lastStatement = statements[statements.length - 1]!
      extractLeadingComments(lastStatement.end)
    }
  }

  function processStatement(stmt: ts.Statement, depth: number = 0): void {
    // Check for // keep:full (multi-line statements)
    const fullStmt = getFullStatement(stmt, src)
    if (fullStmt !== null) {
      const title = pendingFileLabel
      pendingFileLabel = undefined
      mergeOrPushCode(nodes, fullStmt, lang, title)
      return
    }

    // Check if this statement has // keep comment (single-line)
    const lineText = getStatementLine(stmt, src)
    if (lineText !== null && hasKeepComment(lineText)) {
      const title = pendingFileLabel
      pendingFileLabel = undefined
      const cleanedLine = lineText.replace(/\s*\/\/\s*keep\b.*$/, '')
      mergeOrPushCode(nodes, cleanedLine, lang, title)
      return
    }

    // Handle import declarations (legacy code path, now handled above)
    if (ts.isImportDeclaration(stmt)) {
      return
    }

    // Detect test('name', () => { ... }) calls
    if (ts.isExpressionStatement(stmt)) {
      const expr = stmt.expression



      if (ts.isCallExpression(expr) && ts.isIdentifier(expr.expression)) {
        const name = expr.expression.text
        if (name === 'test' || name === 'it' || name === 'example') {
          const testName = getStringArg(expr, 0)
          const body = getFnBody(expr, 1)
          if (body) {
            const code = extractBodyCode(src, body)
            if (code.trim()) {
              const title = pendingFileLabel
              pendingFileLabel = undefined
              // Check if we can find a prose node with a trailing code fence to merge with
              // (looking past any describe nodes)
              let proseNodeIdx = -1
              for (let i = nodes.length - 1; i >= 0; i--) {
                if (nodes[i]!.kind === 'prose') {
                  proseNodeIdx = i
                  break
                } else if (nodes[i]!.kind !== 'describe') {
                  // Stop if we hit a non-prose, non-describe node
                  break
                }
              }
              
              if (proseNodeIdx >= 0) {
                const proseNode = nodes[proseNodeIdx]! as ProseNode
                const fenceMatch = extractTrailingFence(proseNode.text)
                if (fenceMatch) {
                  proseNode.text = fenceMatch.prose;
                  proseNode.noBlankAfter = true
                  // Remove any describe nodes between the prose and here
                  nodes.splice(proseNodeIdx + 1)
                  const mergedCode = fenceMatch.fenceCode + '\n' + code
                  nodes.push(codeNode(lang, mergedCode, title))
                } else if (proseNodeIdx === nodes.length - 1) {
                  // Prose directly precedes this code block (no describe nodes in between), suppress blank line
                  proseNode.noBlankAfter = true
                  nodes.push(codeNode(lang, code, title))
                } else {
                  // There are describe nodes between prose and code, don't suppress blank line
                  nodes.push(codeNode(lang, code, title))
                }
              } else {
                nodes.push(codeNode(lang, code, title))
              }
            } else if (body && !ts.isBlock(body)) {
              // Expression body that extracted to empty/whitespace - warn about this
              const lines = src.slice(body.getFullStart(), body.getEnd()).split('\n').length
              if (lines > 2) {
                console.warn(`⚠ Warning: ${name}('${testName}') expression body (${lines} lines) did not produce output`)
              }
            }
            return
          }
        }
        if (name === 'describe') {
          const descName = getStringArg(expr, 0)
          const body = getFnBody(expr, 1)
          if (body && ts.isBlock(body) && descName !== null) {
            nodes.push({ kind: 'describe', name: descName, depth })
            visitStatements(body.statements, depth + 1, body)
            return
          }
        }
        if (name === 'metaExample') {
          const body = getFnBody(expr, 1)
          if (body) {
            const code = extractBodyCode(src, body)
            if (code.trim()) {
              const title = pendingFileLabel
              pendingFileLabel = undefined
              // 1. Raw example call (original source, assertions not rewritten)
              const rawCall = dedentCallSource(src.slice(expr.getStart(), expr.getEnd()))
                .replace(/^metaExample\b/, 'example')
              nodes.push(codeNode(lang, rawCall, title))
              // 2. "becomes" prose
              nodes.push({ kind: 'prose', text: 'becomes', noBlankBefore: true, noBlankAfter: true })
              // 3. Rendered output as an md code block
              const langAlias = lang === 'typescript' ? 'ts' : lang === 'javascript' ? 'js' : lang
              const innerFence = `\`\`\`${langAlias}\n${code}\n\`\`\``
              nodes.push(codeNode('md', innerFence))
            }
          }
          return
        }
        if (name === 'shellExample') {
          const cmd = getStringArg(expr, 0)
          if (cmd !== null) {
            const title = pendingFileLabel
            pendingFileLabel = undefined
            const optsArg = expr.arguments[1]
            const opts = optsArg && ts.isObjectLiteralExpression(optsArg) ? optsArg : undefined

            // Check if meta: true is explicitly set
            const metaProp = opts ? getProp(opts, 'meta') : undefined
            const hasMeta = metaProp && metaProp.initializer.kind === ts.SyntaxKind.TrueKeyword
            
            // If meta is true, add a code block showing the reconstructed shellExample call
            if (hasMeta) {
              const reconstructed = reconstructShellExampleWithoutMeta(src, expr, cmd, opts)
              nodes.push(codeNode('ts', reconstructed))
              // Add "becomes" separator
              nodes.push({ kind: 'prose', text: 'becomes', noBlankBefore: true, noBlankAfter: true })
            }

            if (opts) processShellExampleInputFiles(opts, nodes)

            const inputFiles = opts ? extractStaticInputFiles(opts) : []

            const exitCodeProp = opts ? getProp(opts, 'exitCode') : undefined
            const expectedExitCode = exitCodeProp && ts.isNumericLiteral(exitCodeProp.initializer)
              ? parseInt(exitCodeProp.initializer.text, 10)
              : 0

            let execution: ShellCommandExecution | null = null
            if (opts && isExecutionNeeded(opts)) {
              const outputPaths = extractOutputFilePaths(opts)
              
              // Build source location for error reporting
              let sourceLocation: SourceLocation | undefined = undefined
              if (filePath) {
                const charPos = expr.getStart()
                const { line, column } = getLineAndColumn(src, charPos)
                sourceLocation = {
                  filePath,
                  line,
                  column
                }
              }
              
              execution = executeShellCommand(cmd, inputFiles, outputPaths, expectedExitCode, sourceLocation)
              
              // Fail if exit code doesn't match expectations
              if (execution && execution.exitCode !== expectedExitCode) {
                const errorLocation = sourceLocation || {
                  filePath: filePath || 'unknown',
                  line: 0,
                  column: 0
                }
                const charPos = expr.getStart()
                throw new ShellExampleError(
                  `shellExample failed: ${cmd}\nexit ${execution.exitCode} (expected exit code ${expectedExitCode})`,
                  errorLocation,
                  charPos,
                  src
                )
              }
            }

            const displayCommand = opts ? readBoolOption(getProp(opts, 'displayCommand')) : true

            const lines: string[] = displayCommand ? [`$ ${cmd}`] : []
            if (opts) appendShellExampleAnnotations(opts, lines, execution)
            if (lines.length > 0) {
              nodes.push(codeNode('sh', lines.join('\n'), title))
            }

            if (opts) processShellExampleOutputFiles(src, opts, nodes, cmd, inputFiles, execution)
          }
          return
        }
      }
    }
  }

  visitStatements(sf.statements)

  // Capture comments before EOF token
  extractLeadingComments(sf.endOfFileToken.getFullStart())

  return nodes
}

/** Typed helper: find a PropertyAssignment by name in an ObjectLiteralExpression. */
function getProp(obj: ts.ObjectLiteralExpression, name: string): ts.PropertyAssignment | undefined {
  return obj.properties.find(
    (p): p is ts.PropertyAssignment => ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === name
  )
}

/** Returns false if prop's initializer is `false` or the string `'hidden'`, true otherwise. */
function readBoolOption(prop: ts.PropertyAssignment | undefined): boolean {
  if (!prop) return true
  const init = prop.initializer
  if (init.kind === ts.SyntaxKind.FalseKeyword) return false
  if (ts.isStringLiteralLike(init) && init.text === 'hidden') return false
  return true
}

/** Returns false if prop's initializer is `false`, true otherwise. */
function readFlag(prop: ts.PropertyAssignment | undefined): boolean {
  if (!prop) return true
  return prop.initializer.kind !== ts.SyntaxKind.FalseKeyword
}

/** Escapes a string value for safe embedding in a TypeScript single-quoted string literal. */
function escapeForSingleQuotedString(s: string): string {
  return s
    .replace(/\\/g, '\\\\')  // backslashes must be escaped first
    .replace(/'/g, "\\'")     // then single quotes
    .replace(/\n/g, '\\n')   // newlines
    .replace(/\r/g, '\\r')   // carriage returns
}

/** Reconstructs shellExample call without the meta option. */
function reconstructShellExampleWithoutMeta(src: string, expr: ts.CallExpression, cmd: string, opts: ts.ObjectLiteralExpression | undefined): string {
  const escapedCmd = escapeForSingleQuotedString(cmd)
  if (!opts) {
    return `shellExample('${escapedCmd}')`
  }

  // Extract options text and remove meta: true
  const optsText = src.slice(opts.getStart(), opts.getEnd())
  
  // Remove "meta: true," or "meta: true" variations
  let cleanedOpts = optsText
    .replace(/,?\s*meta:\s*true\s*,?/g, ',')  // Remove meta: true with surrounding commas
    .replace(/^\{\s*,/, '{')  // Remove leading comma after {
    .replace(/,\s*\}$/, '}')  // Remove trailing comma before }
  
  return `shellExample('${escapedCmd}'${cleanedOpts !== '{}' ? `, ${cleanedOpts}` : ''})`
}

/** Create a CodeNode, omitting the `title` key entirely when undefined. */
function codeNode(lang: string, text: string, title?: string): CodeNode {
  return title !== undefined ? { kind: 'code', lang, text, title } : { kind: 'code', lang, text }
}

function getStringArg(call: ts.CallExpression, index: number): string | null {
  const arg = call.arguments[index]
  if (arg && ts.isStringLiteralLike(arg)) return arg.text
  return null
}

function getFnBody(call: ts.CallExpression, index: number): ts.Block | ts.Expression | null {
  const arg = call.arguments[index]
  if (!arg) return null
  if (ts.isArrowFunction(arg) || ts.isFunctionExpression(arg)) {
    return arg.body
  }
  return null
}

function extractBodyCode(src: string, bodyOrBlock: ts.Block | ts.Expression): string {
  if (!ts.isBlock(bodyOrBlock)) {
    // Expression body - extract the expression as a single "statement"
    return src.slice(bodyOrBlock.getFullStart(), bodyOrBlock.getEnd()).trim()
  }
  const stmts = bodyOrBlock.statements
  if (!stmts.length) return ''

  // Compute block indentation from the column of the first statement token
  const firstStart = stmts[0]!.getStart()
  const lineStart = src.lastIndexOf('\n', firstStart - 1) + 1
  const indent = firstStart - lineStart

  // Include trailing // comment on the last statement's line
  const lastStmt = stmts[stmts.length - 1]!
  const lastEnd = lastStmt.getEnd()
  const lastLineEnd = src.indexOf('\n', lastEnd)
  const textAfterLast = src.slice(lastEnd, lastLineEnd === -1 ? src.length : lastLineEnd)
  const extractEnd = /^\s*\/\//.test(textAfterLast)
    ? (lastLineEnd === -1 ? src.length : lastLineEnd)
    : lastEnd

  // Extract from the full start of the first statement (includes leading whitespace/comments)
  const base = stmts[0]!.getFullStart()
  let raw = src.slice(base, extractEnd)

  // Rewrite recognized assertion statements (end-to-start to preserve offsets)
  const replacements: Array<{ start: number; end: number; text: string }> = []
  for (const stmt of stmts) {
    const rewritten = tryRewriteAssertion(src, stmt, indent)
    if (rewritten !== null) {
      replacements.push({ start: stmt.getStart() - base, end: stmt.getEnd() - base, text: rewritten })
    }
  }
  replacements.sort((a, b) => b.start - a.start)
  for (const r of replacements) {
    raw = raw.slice(0, r.start) + r.text + raw.slice(r.end)
  }

  // Dedent: remove `indent` leading spaces from any line that starts with at least that many spaces.
  // Lines with fewer leading spaces (e.g. template literal content) are kept as-is.
  let result = raw
    .split('\n')
    .map(line => (line.length >= indent && line.slice(0, indent).trim() === '') ? line.slice(indent) : line)
    .join('\n')
    .trim()

  // Clean up excessive blank lines from dropped statements (preserve intentional single blank lines)
  result = result.replace(/\n\n\n+/g, '\n\n')

  // Transform nested assert.ok(expr) → expr // OK
  result = transformNestedAssertOk(result)

  return result
}

/** Strip the shared indentation (determined from the closing line) from a raw call source. */
function dedentCallSource(callText: string): string {
  const lines = callText.split('\n')
  if (lines.length <= 1) return callText
  const lastLine = lines[lines.length - 1]!
  const closingIndent = lastLine.length - lastLine.trimStart().length
  if (closingIndent === 0) return callText
  return lines.map((line, i) => {
    if (i === 0) return line
    return line.length >= closingIndent && line.slice(0, closingIndent).trim() === ''
      ? line.slice(closingIndent)
      : line
  }).join('\n')
}

function commentToProse(raw: string, kind: ts.CommentKind): string | null {
  if (kind === ts.SyntaxKind.SingleLineCommentTrivia) {
    return raw.replace(/^\/\/\s?/, '')
  }
  if (kind === ts.SyntaxKind.MultiLineCommentTrivia) {
    const inner = raw
      .replace(/^\/\*+/, '')
      .replace(/\*+\/$/, '')
      .split('\n')
      .map(l => l.replace(/^\s*\*\s?/, ''))
      .join('\n')
      .trim()
    return inner || null
  }
  return null
}

function isKeptImport(text: string): boolean {
  return /\/\/\s*keep\b/.test(text)
}

function hasKeepComment(text: string): boolean {
  return /\/\/\s*keep\b/.test(text)
}

function isFullKeep(text: string): boolean {
  return /\/\/\s*keep:full\b/.test(text)
}

/** Extract the full line text of a statement (from statement start to end of line).
 *  Returns null if the statement spans multiple lines or we can't extract it. */
function getStatementLine(stmt: ts.Statement, src: string): string | null {
  const lineEnd = src.indexOf('\n', stmt.getEnd())
  const lineText = src.slice(stmt.getStart(), lineEnd === -1 ? src.length : lineEnd).trimEnd()
  
  // Check if statement fits on one line (heuristic: doesn't contain opening brace on different line)
  const lines = lineText.split('\n')
  if (lines.length > 1) {
    // Multi-line statement - for now, only process if it's a simple case
    return null
  }
  
  return lineText
}

/** Extract a full multi-line statement including body.
 *  Searches for // keep:full comment and extracts the entire statement.
 *  Returns null if // keep:full not found. */
function getFullStatement(stmt: ts.Statement, src: string): string | null {
  const stmtStart = stmt.getStart()
  const stmtEnd = stmt.getEnd()
  
  // Only check the first line for // keep:full to avoid false positives
  // from the directive appearing in nested comments or string content.
  const firstLineEnd = src.indexOf('\n', stmtStart)
  const firstLine = src.slice(stmtStart, firstLineEnd === -1 ? src.length : firstLineEnd)
  if (!isFullKeep(firstLine)) {
    return null
  }

  // Extract the entire statement
  const stmtText = src.slice(stmtStart, stmtEnd)
  
  // Compute the indentation of the first line to dedent
  const firstLineMatch = stmtText.match(/^(\s*)/)
  const baseIndent = firstLineMatch ? firstLineMatch[1]!.length : 0
  
  // Dedent all lines by the base indentation
  const dedented = stmtText
    .split('\n')
    .map(line => {
      if (line.length >= baseIndent && line.slice(0, baseIndent).trim() === '') {
        return line.slice(baseIndent)
      }
      return line
    })
    .join('\n')
    .trimEnd()
  
  // Strip the // keep:full comment
  const cleaned = dedented.replace(/\s*\/\/\s*keep:full\b.*$/gm, '')
  
  return cleaned
}

/** Rewrite a recognized assert.X(actual, expected) statement to a readable comment form.
 *  Returns the rewritten string, or null if the statement is not a recognized assertion.
 *  Special case: assert.ok() at statement level returns empty string (drops the line). */
function tryRewriteAssertion(src: string, stmt: ts.Statement, bodyIndent: number): string | null {
  if (!ts.isExpressionStatement(stmt)) return null
  const expr = stmt.expression
  if (!ts.isCallExpression(expr)) return null
  if (!ts.isPropertyAccessExpression(expr.expression)) return null

  const obj = expr.expression.expression
  const method = expr.expression.name.text
  if (!ts.isIdentifier(obj) || obj.text !== 'assert') return null

  // assert.ok(value) at statement level → drop the line (empty string)
  if (method === 'ok') {
    return ''
  }

  // assert.throws(() => expr, pattern?) → expr // throws [pattern]
  if (method === 'throws') {
    const fn = expr.arguments[0]
    if (!fn) return null
    if (ts.isArrowFunction(fn) && !ts.isBlock(fn.body)) {
      const exprText = src.slice(fn.body.getStart(), fn.body.getEnd())
      const patternArg = expr.arguments[1]
      const patternText = patternArg ? src.slice(patternArg.getStart(), patternArg.getEnd()) : null
      return patternText ? `${exprText} // throws ${patternText}` : `${exprText} // throws`
    }
    return null
  }

  const [actual, expected] = expr.arguments
  if (!actual || !expected) return null

  if (['equal', 'strictEqual', 'deepEqual', 'deepStrictEqual'].includes(method)) {
    return formatComparison(src, actual, expected, '=>', bodyIndent)
  }
  if (['notEqual', 'notStrictEqual', 'notDeepEqual', 'notDeepStrictEqual'].includes(method)) {
    return formatComparison(src, actual, expected, '!=', bodyIndent)
  }

  return null
}

function formatComparison(
  src: string,
  actual: ts.Expression,
  expected: ts.Expression,
  op: string,
  bodyIndent: number
): string {
  const actualText = src.slice(actual.getStart(), actual.getEnd())
  const expectedRaw = src.slice(expected.getStart(), expected.getEnd())

  // Dedent continuation lines by their minimum indentation
  const expectedText = dedentContinuationLines(expectedRaw)

  const lines = expectedText.split('\n')
  if (lines.length === 1) {
    return `${actualText} // ${op} ${expectedText}`
  }
  // Multi-line: first line appended to actual, remaining lines become // comments
  // Continuation lines are indented so that `//` aligns with the opening `//` after dedenting
  const first = lines[0]!
  const indent = ' '.repeat(actualText.length + 1 + bodyIndent)
  const rest = lines.slice(1).map(l => `${indent}// ${l}`)
  return [`${actualText} // ${op} ${first}`, ...rest].join('\n')
}

/** Dedent continuation lines (lines after the first) by their minimum indentation. */
function dedentContinuationLines(text: string): string {
  const lines = text.split('\n')
  if (lines.length === 1) return text
  const contLines = lines.slice(1).filter(l => l.trim().length > 0)
  if (!contLines.length) return text
  const minInd = Math.min(...contLines.map(l => l.length - l.trimStart().length))
  if (minInd === 0) return text
  return [
    lines[0]!,
    ...lines.slice(1).map(l => (l.length >= minInd && l.slice(0, minInd).trim() === '') ? l.slice(minInd) : l)
  ].join('\n')
}


/** If prose ends with a ```…``` fence, split it off. Returns null if no trailing fence. */
function extractTrailingFence(prose: string): { prose: string; fenceCode: string } | null {
  // Match a trailing fenced code block: ```(lang)?\n...\n```
  const match = prose.match(/^([\s\S]*?)\n?```[^\n]*\n([\s\S]*?)```\s*$/)
  if (!match) return null
  return {
    prose: match[1]!.trimEnd(),
    fenceCode: match[2]!.trimEnd()
  }
}

function mergeOrPushCode(nodes: DocNode[], text: string, lang: string, title: string | undefined): void {
  const last = nodes[nodes.length - 1]
  // Merge consecutive kept imports into one code block
  if (last?.kind === 'code' && last.title === undefined && title === undefined) {
    last.text = last.text + '\n' + text
  } else {
    nodes.push(codeNode(lang, text, title))
  }
}

function mergeOrPushProse(nodes: DocNode[], text: string): void {
  const last = nodes[nodes.length - 1]
  if (last?.kind === 'prose' && !last.terminal) {
    last.text = last.text + '\n' + text
  } else {
    nodes.push({ kind: 'prose', text })
  }
}

/** Transform nested assert.ok(expr) calls to expr // OK */
function transformNestedAssertOk(code: string): string {
  // Heuristic: replaces assert.ok(expr) → expr // OK; may miss complex cases
  return code.replace(/assert\.ok\(([^)]+)\)/g, '$1 // OK')
}



/** Helper to detect language from file extension */
function getLanguageFromExtension(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || ''
  const langMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    json: 'json',
    md: 'markdown',
    yaml: 'yaml',
    yml: 'yaml',
    sh: 'sh',
    bash: 'bash',
    py: 'python',
    rs: 'rust',
    go: 'go',
    java: 'java',
    cs: 'csharp',
    rb: 'ruby',
    php: 'php',
    html: 'html',
    css: 'css',
    xml: 'xml',
    txt: 'text'
  }
  return langMap[ext] || ext || 'text'
}

/** Helper to detect if a language supports C-style comments (// ...) */
function supportsCStyleComments(lang: string): boolean {
  const cStyleLangs = new Set([
    'typescript', 'javascript', 'java', 'csharp', 'go', 'rust',
    'cpp', 'c', 'objc', 'swift', 'kotlin', 'scala', 'groovy'
  ])
  return cStyleLangs.has(lang)
}

/** Extracts input files from shellExample options and creates separate code blocks */
function processShellExampleInputFiles(opts: ts.ObjectLiteralExpression, nodes: DocNode[]): void {
  const inputFilesProp = getProp(opts, 'inputFiles')
  
  if (!inputFilesProp || !ts.isArrayLiteralExpression(inputFilesProp.initializer)) {
    return
  }

  for (const el of inputFilesProp.initializer.elements) {
    if (!ts.isObjectLiteralExpression(el)) continue
    const pathProp = getProp(el, 'path')
    const contentProp = getProp(el, 'content')
    const displayPathProp = getProp(el, 'displayPath')
    const summaryProp = getProp(el, 'summary')
    const displayProp = getProp(el, 'display')
    const displayContent = readBoolOption(displayProp)

    if (!pathProp || !ts.isStringLiteralLike(pathProp.initializer)) continue
    const filePath = pathProp.initializer.text

    const displayPath = readBoolOption(displayPathProp)
    const summary = readFlag(summaryProp)

    if (contentProp && displayContent && ts.isStringLiteralLike(contentProp.initializer)) {
      const content = contentProp.initializer.text
      const lang = getLanguageFromExtension(filePath)
      
      // Add label/prose based on language type (only if summary and displayPath are true)
      if (!supportsCStyleComments(lang) && displayPath && summary) {
        // Non-C-style: add prose label before code block
        nodes.push({ kind: 'prose', text: `With input file \`${filePath}\`:`, noBlankAfter: true })
      }
      
      // Create code block with label for C-style languages (only if summary and displayPath are true)
      let blockText = adjustHSpacing(content)
      if (supportsCStyleComments(lang) && displayPath && summary) {
        blockText = `// Input file "${filePath}":\n${blockText}`
      }
      
      nodes.push({ kind: 'code', lang, text: blockText })
    }
  }
}

export function adjustHSpacing(s: string): string {
  const lines = s
    .split('\n')
    .map(line => line.trimEnd())
    .map(line => line.match(/^\s*$/) ? '' : line)

  if (lines[0] === '') lines.shift() // Don't start with a blank line

  const indents = lines
    .filter(line => !!line) // Only consider non-blank lines for indentation
    .map(line => line.replace(/[^\t ].*$/,'').length)
  if (indents[0] == 0) indents.shift() // First lines might start at quote level, so ignore zero indent
  const minIndent = Math.min(...indents)

  const stripIndents = minIndent > 4 && minIndent !== Infinity

  return lines.map((line, i) => {
    if (!stripIndents || (i === 0 && line[0] != ' ')) return line
    return line.substring(minIndent)
  }).join('\n')
}

const OUTPUT_FILE_INLINE_LIMIT = 60

/** Emits separate prose/code nodes for output file assertions, after the sh block */
function processShellExampleOutputFiles(
  src: string,
  opts: ts.ObjectLiteralExpression,
  nodes: DocNode[],
  cmd: string,
  inputFiles: Array<InputFileInfo>,
  execution: ShellCommandExecution | null
): void {
  const outputFilesProp = getProp(opts, 'outputFiles')

  if (!outputFilesProp || !ts.isArrayLiteralExpression(outputFilesProp.initializer)) {
    return
  }

  for (const el of outputFilesProp.initializer.elements) {
    if (!ts.isObjectLiteralExpression(el)) continue
    const pathProp = getProp(el, 'path')
    const containsProp = getProp(el, 'contains')
    const matchesProp = getProp(el, 'matches')
    const displayProp = getProp(el, 'display')
    const displayPathProp = getProp(el, 'displayPath')
    const summaryProp = getProp(el, 'summary')
    
    const display = displayProp && ts.isStringLiteralLike(displayProp.initializer)
      ? displayProp.initializer.text : undefined

    if (!pathProp || !ts.isStringLiteralLike(pathProp.initializer)) continue
    const filePath = pathProp.initializer.text
    const lang = getLanguageFromExtension(filePath)

    const displayPath = readBoolOption(displayPathProp)
    const summary = readFlag(summaryProp)

    let emitDisplayNode = display !== 'none'

    if (matchesProp && ts.isRegularExpressionLiteral(matchesProp.initializer)) {
      if (summary) {
        const regexText = src.slice(matchesProp.initializer.getStart(), matchesProp.initializer.getEnd())
        const proseText = displayPath 
          ? `Output file \`${filePath}\` matches \`${regexText}\`.`
          : `Matches \`${regexText}\`.`
        nodes.push({ kind: 'prose', text: proseText, terminal: true })
      }
    } else if (containsProp && ts.isStringLiteralLike(containsProp.initializer)) {
      const text = containsProp.initializer.text
      const isMultiLine = text.includes('\n')
      if (!isMultiLine && text.length < OUTPUT_FILE_INLINE_LIMIT) {
        // Short single-line: backtick format
        if (summary) {
          const proseText = displayPath
            ? `Output file \`${filePath}\` contains \`${text}\`.`
            : `Contains \`${text}\`.`
          nodes.push({ kind: 'prose', text: proseText, terminal: true })
        }
      } else {
        // Truncate to 60 chars or first newline for the summary
        const firstNewline = text.indexOf('\n')
        const truncateAt = isMultiLine ? Math.min(firstNewline, OUTPUT_FILE_INLINE_LIMIT) : OUTPUT_FILE_INLINE_LIMIT
        const truncated = text.slice(0, truncateAt)
        if (isMultiLine) {
          // Multi-line: colon + excerpt code block; no display node (excerpt IS the content spec)
          if (summary) {
            const proseText = displayPath
              ? `Output file \`${filePath}\` contains ${truncated}...:`
              : `Contains ${truncated}...:`
            nodes.push({ kind: 'prose', text: proseText, terminal: true, noBlankAfter: true })
          }
          nodes.push({ kind: 'code', lang, text: `...\n${text}\n...` })
          emitDisplayNode = false
        } else {
          // Long single-line: truncated summary, period
          if (summary) {
            const proseText = displayPath
              ? `Output file \`${filePath}\` contains ${truncated}....`
              : `Contains ${truncated}....`
            nodes.push({ kind: 'prose', text: proseText, terminal: true })
          }
        }
      }
    } else {
      // Neither contains nor matches: display the full file contents
      if (summary) {
        const proseText = displayPath
          ? `Output file \`${filePath}\`:`
          : `Output:`
        nodes.push({ kind: 'prose', text: proseText, terminal: true, noBlankAfter: true })
      }
      emitDisplayNode = true
    }

    if (emitDisplayNode) {
      const node: OutputFileDisplayNode = { kind: 'output-file-display', path: filePath, lang, cmd, inputFiles }
      if (execution) {
        node.execution = execution
      }
      nodes.push(node)
    }
  }
}

/** Extracts inputFiles entries statically from a shellExample opts AST node */
function extractStaticInputFiles(opts: ts.ObjectLiteralExpression): Array<InputFileInfo> {
  const inputFilesProp = getProp(opts, 'inputFiles')
  if (!inputFilesProp || !ts.isArrayLiteralExpression(inputFilesProp.initializer)) return []
  const result: Array<InputFileInfo> = []
  for (const el of inputFilesProp.initializer.elements) {
    if (!ts.isObjectLiteralExpression(el)) continue
    const pathProp = getProp(el, 'path')
    const contentProp = getProp(el, 'content')
    if (!pathProp || !ts.isStringLiteralLike(pathProp.initializer)) continue
    if (!contentProp || !ts.isStringLiteralLike(contentProp.initializer)) continue
    result.push({ path: pathProp.initializer.text, content: contentProp.initializer.text })
  }
  return result
}

/** Determines if command execution is needed based on shellExample options */
function isExecutionNeeded(opts: ts.ObjectLiteralExpression): boolean {
  // Check if stdout.display is true
  const stdoutProp = getProp(opts, 'stdout')
  if (stdoutProp && ts.isObjectLiteralExpression(stdoutProp.initializer)) {
    const displayProp = getProp(stdoutProp.initializer, 'display')
    if (displayProp && displayProp.initializer.kind === ts.SyntaxKind.TrueKeyword) {
      return true
    }
  }

  // Check if any outputFiles need display
  const outputFilesProp = getProp(opts, 'outputFiles')
  if (!outputFilesProp || !ts.isArrayLiteralExpression(outputFilesProp.initializer)) {
    return false
  }

  for (const el of outputFilesProp.initializer.elements) {
    if (!ts.isObjectLiteralExpression(el)) continue
    const displayProp = getProp(el, 'display')
    const containsProp = getProp(el, 'contains')
    const matchesProp = getProp(el, 'matches')
    
    // display !== 'none' means we need to execute
    const display = displayProp && ts.isStringLiteralLike(displayProp.initializer)
      ? displayProp.initializer.text : undefined
    
    // Need execution if display is not 'none' AND (no contains/matches OR they're multi-line)
    if (display !== 'none') {
      const hasMatches = matchesProp && ts.isRegularExpressionLiteral(matchesProp.initializer)

      if (!containsProp && !hasMatches) {
        // No inline assertion - need to execute to get full file content
        return true
      }
      if (containsProp && ts.isStringLiteralLike(containsProp.initializer)) {
        const text = containsProp.initializer.text
        if (text.includes('\n') || text.length >= OUTPUT_FILE_INLINE_LIMIT) {
          // Multi-line or long content - need to execute
          return true
        }
      }
    }
  }

  return false
}

/** Extracts output file paths from shellExample options that need execution */
function extractOutputFilePaths(opts: ts.ObjectLiteralExpression): string[] {
  const outputFilesProp = getProp(opts, 'outputFiles')
  if (!outputFilesProp || !ts.isArrayLiteralExpression(outputFilesProp.initializer)) {
    return []
  }

  const paths: string[] = []
  for (const el of outputFilesProp.initializer.elements) {
    if (!ts.isObjectLiteralExpression(el)) continue
    const pathProp = getProp(el, 'path')
    if (pathProp && ts.isStringLiteralLike(pathProp.initializer)) {
      paths.push(pathProp.initializer.text)
    }
  }
  return paths
}

/** Executes a shell command with optional input files and captures stdout + output files */
function executeShellCommand(
  cmd: string,
  inputFiles: Array<InputFileInfo>,
  outputFilePaths: string[],
  expectedExitCode = 0,
  sourceLocation?: SourceLocation
): ShellCommandExecution | null {
  const tmpDir = mkdtempSync(join(tmpdir(), 'lit-md-exec-'))
  const resolvePath = (p: string) => isAbsolute(p) ? p : join(tmpDir, p)
  try {
    // Write input files
    for (const f of inputFiles) {
      writeFileSync(resolvePath(f.path), f.content, 'utf8')
    }

    // Execute command with alias prefix
    const prefix = buildAliasPrefix()
    const fullCmd = prefix ? `${prefix}${cmd}` : cmd
    const result = spawnSync(fullCmd, { shell: true, encoding: 'utf8', cwd: tmpDir })
    
    // Capture output files when exit code matches expectation
    const outputFiles = new Map<string, string>()
    if ((result.status ?? 1) === expectedExitCode) {
      for (const filePath of outputFilePaths) {
        try {
          const content = readFileSync(resolvePath(filePath), 'utf8')
          outputFiles.set(filePath, content)
        } catch {
          // File doesn't exist or can't be read - skip it
        }
      }
    }

    return {
      stdout: result.stdout.trimEnd(),
      outputFiles,
      exitCode: result.status ?? 1
    }
  } catch (e) {
    return null
  } finally {
    rmSync(tmpDir, { recursive: true, force: true })
  }
}

/** Reads shellExample options and appends annotation lines (# => ..., single-line # input-file: ...) */
function appendShellExampleAnnotations(
  opts: ts.ObjectLiteralExpression,
  lines: string[],
  execution: ShellCommandExecution | null
): void {
  for (const prop of opts.properties) {
    if (!ts.isPropertyAssignment(prop) || !ts.isIdentifier(prop.name)) continue
    const key = prop.name.text

    if (key === 'exitCode' && ts.isNumericLiteral(prop.initializer)) {
      const code = parseInt(prop.initializer.text, 10)
      if (code !== 0) {
        lines.push(`# exits: ${code}`)
      }
    }

    if (key === 'stdout' && ts.isObjectLiteralExpression(prop.initializer)) {
      const containsProp = getProp(prop.initializer, 'contains')
      const displayProp = getProp(prop.initializer, 'display')
      
      // If display is true, use cached execution to show stdout
      if (displayProp && displayProp.initializer.kind === ts.SyntaxKind.TrueKeyword) {
        if (execution && execution.exitCode === 0) {
          lines.push(execution.stdout)
        } else if (execution && execution.exitCode !== 0) {
          // This shouldn't happen now since we throw on exit code mismatch
          lines.push(`# [ERROR] stdout unavailable (exit code: ${execution.exitCode})`)
        } else {
          // This shouldn't happen now since we throw on errors
          lines.push(`# [ERROR] stdout unavailable (execution failed)`)
        }
      } else if (containsProp && ts.isStringLiteralLike(containsProp.initializer)) {
        // Show contains assertion only if display is not true
        lines.push(containsProp.initializer.text)
      }
    }

    if (key === 'inputFiles' && ts.isArrayLiteralExpression(prop.initializer)) {
      for (const el of prop.initializer.elements) {
        if (!ts.isObjectLiteralExpression(el)) continue
        const pathProp = getProp(el, 'path')
        const contentProp = getProp(el, 'content')
        const displayPathProp = getProp(el, 'displayPath')
        const summaryProp = getProp(el, 'summary')

        if (!pathProp || !ts.isStringLiteralLike(pathProp.initializer)) continue
        const filePath = pathProp.initializer.text

        const displayPath = readBoolOption(displayPathProp)
        const summary = readFlag(summaryProp)

        if (contentProp && ts.isStringLiteralLike(contentProp.initializer)) {
          const content = contentProp.initializer.text
          const lang = getLanguageFromExtension(filePath)
          // Only add single-line annotation for C-style languages; others emit a separate code block
          // Skip if displayPath or summary is false
          if (!content.includes('\n') && supportsCStyleComments(lang) && displayPath && summary) {
            lines.push(`# Input file \`${filePath}\` contains \`${content}\``)
          }
        }
      }
    }
  }
}
