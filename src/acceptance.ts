import { readFileSync, writeFileSync, readdirSync, existsSync, mkdtempSync, rmSync } from 'node:fs'
import { basename, extname, dirname, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { parse } from './parser.ts'
import { render } from './renderer.ts'
import { resolveOutputFiles } from './resolver.ts'
import { resetDescribeFormat, resolveDescribeFormat } from './describe-format.ts'

export interface AcceptanceTestResult {
  passed: number
  failed: number
  total: number
  errors: Array<{ file: string; message: string }>
}

function colorize(diff: string): string {
  const { TERM, COLORTERM, FORCE_COLOR, NO_COLOR } = process.env
  const useColor = !NO_COLOR && (
    FORCE_COLOR !== undefined ||
    COLORTERM !== undefined ||
    (TERM !== undefined && TERM !== 'dumb') ||
    process.stdout.isTTY ||
    process.stderr.isTTY
  )
  if (!useColor) return diff
  return diff.split('\n').map(line => {
    if (line.startsWith('---') || line.startsWith('+++')) return `\x1b[1m${line}\x1b[0m`
    if (line.startsWith('-')) return `\x1b[31m${line}\x1b[0m`
    if (line.startsWith('+')) return `\x1b[32m${line}\x1b[0m`
    if (line.startsWith('@@')) return `\x1b[36m${line}\x1b[0m`
    return line
  }).join('\n')
}

function computeDiff(name: string, expected: string, actual: string): string | null {
  const dir = mkdtempSync(join(tmpdir(), `lit-md-${name}-`))
  const expFile = join(dir, 'expected.md')
  const actFile = join(dir, 'actual.md')
  try {
    writeFileSync(expFile, expected)
    writeFileSync(actFile, actual)
    const result = spawnSync('diff', ['-u', '--label', 'expected', '--label', 'actual', expFile, actFile])
    if (result.status === 0) return null
    return colorize(result.stdout.toString())
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

/**
 * Get the snapshot filename for an input file.
 * For input `code-blocks.lit-md.ts` → `code-blocks.snapshot.md`
 * For input `javascript-basics.js` → `javascript-basics.snapshot.md`
 */
function getSnapshotFileName(inputPath: string): string {
  const base = basename(inputPath)
  let name = base.slice(0, base.lastIndexOf('.'))
  
  // Remove .lit-md suffix if present
  if (name.endsWith('.lit-md')) {
    name = name.slice(0, -'.lit-md'.length)
  }
  
  return `${name}.snapshot.md`
}

/**
 * Get the snapshot file path for an input file.
 * 
 * @param inputPath - Path to input file
 * @param snapshotDir - Directory where snapshots are stored (usually same as input dir, or --outDir if specified)
 * @returns Full path to snapshot file
 */
function getSnapshotPath(inputPath: string, snapshotDir: string): string {
  const snapshotName = getSnapshotFileName(inputPath)
  return join(snapshotDir, snapshotName)
}

/**
 * Match snapshots for test files. Compares generated markdown against snapshot files.
 * If snapshot is missing, auto-generates it (like the test/acceptance.ts behavior).
 * 
 * @param inputPaths - Paths to input test files
 * @param snapshotDir - Directory where snapshots are stored (usually input dir, or --outDir if specified)
 * @param describeFormat - Describe format to use (default: '##')
 * @returns Test result with pass/fail counts and error details
 */
export async function matchSnapshots(
  inputPaths: string[],
  snapshotDir: string,
  describeFormat: string = '##'
): Promise<AcceptanceTestResult> {
  const result: AcceptanceTestResult = {
    passed: 0,
    failed: 0,
    total: 0,
    errors: []
  }

  for (const inputPath of inputPaths) {
    result.total++
    
    try {
      // Reset the describe format override before processing each file
      resetDescribeFormat()
      
      // Import the file to allow module-level setup (like setDescribeFormat calls)
      try {
        // Use file:// URL for absolute paths to ensure proper module loading
        // Add cache-busting query param to force re-execution of module
        const fileUrl = inputPath.startsWith('/') ? 'file://' + inputPath : inputPath
        await import(fileUrl + '?t=' + Date.now())
      } catch {
        // File might not be importable, continue
      }

      const src = readFileSync(inputPath, 'utf8')
      const lang = extname(inputPath) === '.js' ? 'javascript' : 'typescript'
      
      const { resolveDescribeFormat: resolveFmt } = await import('./describe-format.ts')
      const finalDescribeFormat = resolveFmt(describeFormat)
      const generated = render(resolveOutputFiles(parse(src, lang)), finalDescribeFormat).trimEnd()
      
      const snapshotPath = getSnapshotPath(inputPath, snapshotDir)
      
      // If snapshot is missing, regenerate it (like test/acceptance.ts)
      if (!existsSync(snapshotPath)) {
        writeFileSync(snapshotPath, generated + '\n', 'utf8')
        console.log(`✓ generated snapshot: ${snapshotPath}`)
        result.passed++
        continue
      }
      
      const expected = readFileSync(snapshotPath, 'utf8').trimEnd()
      const diff = computeDiff(basename(inputPath), expected, generated)
      
      if (diff !== null) {
        result.failed++
        result.errors.push({
          file: basename(inputPath),
          message: diff
        })
      } else {
        result.passed++
      }
    } catch (error) {
      result.failed++
      result.errors.push({
        file: basename(inputPath),
        message: error instanceof Error ? error.message : String(error)
      })
    }
  }

  return result
}
