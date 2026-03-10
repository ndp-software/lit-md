// DEPRECATED: This file is kept for backward compatibility. 
// Use `lit-md --match-snapshot` CLI flag instead. See package.json scripts:
// - test:match: Run snapshot validation
// - test:match:watch: Run snapshot validation in watch mode

import {describe, test} from 'node:test'
import {readFileSync, readdirSync, writeFileSync, mkdtempSync, rmSync, existsSync} from 'node:fs'
import {spawnSync} from 'node:child_process'
import {tmpdir} from 'node:os'
import {fileURLToPath} from 'url'
import {dirname, join, extname, basename} from 'path'
import {parse} from '../src/parser.ts'
import {render} from '../src/renderer.ts'
import {resolveOutputFiles} from '../src/resolver.ts'
import {resetDescribeFormat} from '../src/describe-format.ts'

const __dir = dirname(fileURLToPath(import.meta.url))
const files = readdirSync(join(__dir, 'acceptance'), { withFileTypes: true })
  .filter(d => d.isFile() && (d.name.endsWith('.ts') || d.name.endsWith('.js')))

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

describe('acceptance', () => {
  files.forEach(dirent => {
    // Strip both .lit-md.ts/.lit-md.js and .ts/.js extensions to get base name
    let name = basename(dirent.name, extname(dirent.name))
    if (name.endsWith('.lit-md')) {
      name = name.slice(0, -'.lit-md'.length)
    }
    test(name, async () => {
      // Reset the describe format override before each test
      resetDescribeFormat()
      
      const inputPath = join(__dir, 'acceptance', dirent.name)
      const snapshotPath = join(__dir, 'acceptance', `${name}.snapshot.md`)

      // Import the file to allow module-level setup (like setDescribeFormat calls)
      try {
        // Suppress test output during import
        const origStdoutWrite = process.stdout.write
        const origStderrWrite = process.stderr.write
        const origLog = console.log
        const origInfo = console.info
        const origWarn = console.warn
        try {
          process.stdout.write = () => true as any
          process.stderr.write = () => true as any
          console.log = () => {}
          console.info = () => {}
          console.warn = () => {}
          await import(inputPath)
          // Wait for deferred test execution to complete while output is suppressed
          await new Promise(resolve => setTimeout(resolve, 100))
        } finally {
          process.stdout.write = origStdoutWrite
          process.stderr.write = origStderrWrite
          console.log = origLog
          console.info = origInfo
          console.warn = origWarn
        }
      } catch {
        // File might not be importable, continue
      }

      const src = readFileSync(inputPath, 'utf8')
      const lang = extname(inputPath) === '.js' ? 'javascript' : 'typescript'
      
      const { resolveDescribeFormat } = await import('../src/describe-format.ts')
      const finalDescribeFormat = resolveDescribeFormat('##')
      const generated = render(resolveOutputFiles(parse(src, lang)), finalDescribeFormat).trimEnd()
      
      // If snapshot is missing, regenerate it
      if (!existsSync(snapshotPath)) {
        writeFileSync(snapshotPath, generated + '\n', 'utf8')
        console.log(`✓ generated snapshot: ${snapshotPath}`)
        return
      }
      
      const expected = readFileSync(snapshotPath, 'utf8').trimEnd()

      const diff = computeDiff(name, expected, generated)
      if (diff !== null) throw new Error(`\n${diff}`)
    })
  })
})
