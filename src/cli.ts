#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname, basename, extname, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { parse } from './parser.ts'
import { render } from './renderer.ts'
import { typecheck } from './typecheck.ts'
import { stripTypesFlag, watchFilesAndWait } from './shell.ts'
import { resolveOutputFiles } from './resolver.ts'
import { resolveDescribeFormat, resetDescribeFormat } from './describe-format.ts'
import { matchSnapshots } from './acceptance.ts'

// Handle unhandled promise rejections and exceptions
let hasUnhandledError = false

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled rejection:', reason)
  hasUnhandledError = true
  process.exitCode = 1
})

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error)
  hasUnhandledError = true
  process.exitCode = 1
})

// --- Argument parsing ---

const args = process.argv.slice(2)

function extractFlag(flag: string): boolean {
  const idx = args.indexOf(flag)
  if (idx === -1) return false
  args.splice(idx, 1)
  return true
}

function extractFlagValue(flag: string): string | undefined {
  const idx = args.indexOf(flag)
  if (idx === -1) {
    // Check for --flag=value format
    const eqIdx = args.findIndex(arg => arg.startsWith(flag + '='))
    if (eqIdx === -1) return undefined
    const value = args[eqIdx]!.slice(flag.length + 1)
    args.splice(eqIdx, 1)
    return value
  }
  const value = args[idx + 1]
  args.splice(idx, 2)
  return value
}

const showHelp = extractFlag('--help') || extractFlag('-h')
const dryrun = extractFlag('--dryrun')
const runTests = extractFlag('--test')
const runTypecheck = extractFlag('--typecheck')
const updateSnapshots = extractFlag('--update-snapshots') || extractFlag('-u')
const matchSnapshot = extractFlag('--match-snapshot')
const watch = extractFlag('--watch')
const outFlag = extractFlagValue('--out')
const outputDir = extractFlagValue('--outDir')
const describeFormat = extractFlagValue('--describe') || '##'

// Helper to parse test summary from output
function parseTestSummary(output: string): { passed: number; failed: number; total: number; hasFailed: boolean } {
  const lines = output.split('\n')
  let stats = { passed: 0, failed: 0, total: 0, hasFailed: false }
  
  for (const line of lines) {
    if (line.includes('ℹ pass')) {
      const match = line.match(/pass\s+(\d+)/)
      if (match) stats.passed = parseInt(match[1])
    }
    if (line.includes('ℹ fail')) {
      const match = line.match(/fail\s+(\d+)/)
      if (match) stats.failed = parseInt(match[1])
    }
    if (line.includes('ℹ tests')) {
      const match = line.match(/tests\s+(\d+)/)
      if (match) stats.total = parseInt(match[1])
    }
    // Check for async activity errors (unhandled rejections after test ends)
    if (line.includes('Error: A resource generated asynchronous activity after the test ended') ||
        line.includes('unhandledRejection') ||
        line.includes('uncaughtException')) {
      stats.hasFailed = true
    }
  }
  
  stats.hasFailed = stats.hasFailed || stats.failed > 0
  return stats
}

/**
 * Clean up test failure output by removing noisy stack traces and keeping just
 * the meaningful error information.
 */
function cleanTestFailureOutput(output: string): string {
  const lines = output.split('\n')
  const cleanedLines: string[] = []
  let inStackTrace = false
  let skipNextBlankLine = false
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    
    // Skip internal Node.js test runner stack traces
    if (trimmed.startsWith('at ') && (
      trimmed.includes('_runShellExample') ||
      trimmed.includes('TestContext') ||
      trimmed.includes('Test.run') ||
      trimmed.includes('Test.start') ||
      trimmed.includes('Suite') ||
      trimmed.includes('node:internal/test_runner')
    )) {
      inStackTrace = true
      skipNextBlankLine = true
      continue
    }
    
    // Skip blank lines that follow stack traces
    if (skipNextBlankLine && trimmed === '') {
      skipNextBlankLine = false
      continue
    }
    skipNextBlankLine = false
    
    // Keep lines that are part of error messages or not stack traces
    if (!inStackTrace || !trimmed.startsWith('at ')) {
      inStackTrace = false
      cleanedLines.push(line)
    }
  }
  
  // Remove consecutive blank lines
  const result: string[] = []
  let lastWasBlank = false
  for (const line of cleanedLines) {
    const isBlank = line.trim() === ''
    if (isBlank && lastWasBlank) continue
    result.push(line)
    lastWasBlank = isBlank
  }
  
  return result.join('\n').trim()
}

/**
 * Build a map of shell commands to their line numbers in source files.
 * This allows us to show where a failing shellExample call is in the source.
 */
function buildCommandLineMap(inputPaths: string[]): Map<string, Array<{ file: string; line: number }>> {
  const commandMap = new Map<string, Array<{ file: string; line: number }>>()
  
  for (const inputPath of inputPaths) {
    try {
      const content = readFileSync(inputPath, 'utf-8')
      const lines = content.split('\n')
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        // Match shellExample('command', ...) patterns
        const match = line.match(/shellExample\s*\(\s*['"`]([^'"`]+)['"`]/)
        if (match) {
          const cmd = match[1]
          if (!commandMap.has(cmd)) {
            commandMap.set(cmd, [])
          }
          commandMap.get(cmd)!.push({
            file: basename(inputPath),
            line: i + 1
          })
        }
      }
    } catch {
      // Skip files that can't be read
    }
  }
  
  return commandMap
}

/**
 * Enhance test failure output by adding line numbers from source files
 * when a shell command error is detected.
 */
function enhanceTestOutputWithLineNumbers(output: string, commandMap: Map<string, Array<{ file: string; line: number }>>): string {
  const lines = output.split('\n')
  const enhanced: string[] = []
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    enhanced.push(line)
    
    // Look for error messages that start with "Error: Command failed:"
    if (line.includes('Error: Command failed:')) {
      // Extract the command from the error message
      const commandMatch = line.match(/Error: Command failed: ([^\n]+)/)
      if (commandMatch) {
        const cmd = commandMatch[1].trim()
        const locations = commandMap.get(cmd)
        if (locations && locations.length > 0) {
          // Add a line showing where the command is defined
          const locationStrs = locations.map(loc => `${loc.file}:${loc.line}`).join(', ')
          enhanced.push(`  at ${locationStrs}`)
        }
      }
    }
  }
  
  return enhanced.join('\n')
}

// Check for unknown options
const unknownOptions = args.filter(a => a.startsWith('--') || (a.startsWith('-') && a.length > 1 && a !== '-'))
if (unknownOptions.length > 0) {
  console.error(`error: unknown option${unknownOptions.length > 1 ? 's' : ''}: ${unknownOptions.join(', ')}`)
  process.exit(1)
}

const inputPaths = args.filter(a => !a.startsWith('--'))

// --- File name rewriting helper ---

function getOutputFileName(inputPath: string): string {
  const base = basename(inputPath)
  // Check if file ends with .lit-md.ts or .lit-md.js pattern
  if (base.endsWith('.lit-md.ts') || base.endsWith('.lit-md.js')) {
    // Remove the entire .lit-md.ts or .lit-md.js extension
    return base.slice(0, -(base.endsWith('.lit-md.ts') ? '.lit-md.ts'.length : '.lit-md.js'.length)) + '.md'
  }
  // Otherwise, remove the final extension (.ts, .js, etc.) and add .md
  return basename(inputPath, extname(inputPath)) + '.md'
}

// --- Help ---

if (showHelp) {
  console.log(`lit-md - Generate markdown documentation from test files

Usage: lit-md [options] <file.ts|js> [file2 ...]

Options:
  --help, -h                Show this help message
  --test                    Run tests before generating markdown
  --typecheck               Run type checking before generating markdown
  --dryrun                  Show what would be written without writing files
  -u, --update-snapshots    Update snapshot files instead of generating markdown
  --match-snapshot          After generating markdown, validate against snapshot files.
                             Auto-generates snapshots if missing. Fails if mismatch found.
                             Works with --test, --typecheck, and --watch.
  --watch                   After generating, keep the process alive and watch for file
                             changes. Press space to manually regenerate, Ctrl+C to exit.
                             Works with --test, --typecheck, and --match-snapshot.
  --out <output.md>         Write to a specific output file (requires single input)
                             Cannot be used with --update-snapshots or --match-snapshot
  --outDir <dir>           Write generated markdown files to this directory
  --describe <format>       Control describe() block rendering (default: ##)
                            Formats:
                              hidden  - Omit describes
                              #       - Render as h1 headers, nested as h2, h3, etc.
                              ##      - Render as h2 headers, nested as h3, h4, etc. (default)
                              ###     - Render as h3 headers, nested as h4, h5, etc.
                              ####    - Render as h4 headers, nested as h5, h6, etc.
                              auto    - Dynamically determine level based on document structure
                                        (h1 if no headers exist, else one level deeper than last header)

By default, output is written to stdout. Use --out or --outDir to write to files.

Examples:
  lit-md README.md.test.ts                                  # outputs to stdout
  lit-md --test --typecheck README.md.test.ts               # outputs to stdout after testing
  lit-md --watch README.md.test.ts                          # outputs to stdout, then watches for changes
  lit-md --match-snapshot test/acceptance/*.ts              # validates against snapshots
  lit-md --match-snapshot --watch test/acceptance/*.ts      # watches and validates snapshots
  lit-md --out /tmp/docs.md README.md.test.ts               # writes to file
  lit-md --outDir ./docs src/**/*.md.test.ts                # writes to directory
  lit-md --describe="#" README.md.test.ts                   # outputs to stdout with custom format
  lit-md --describe="auto" README.md.test.ts                # outputs to stdout with auto format
`)
  process.exit(0)
}

// --- Validation ---

if (!inputPaths.length) {
  console.error('Usage: lit-md [--test] [--typecheck] [--dryrun] [-u|--update-snapshots] [--out <output.md>] [--outDir <dir>] <file.ts|js> [file2 ...]')
  process.exit(1)
}

const validDescribeFormats = ['hidden', 'auto', '#', '##', '###', '####']
if (!validDescribeFormats.includes(describeFormat)) {
  console.error(`error: invalid --describe format: ${describeFormat}. Valid formats: ${validDescribeFormats.join(', ')}`)
  process.exit(1)
}

if (outFlag && outputDir) {
  console.error('error: --out and --outDir are mutually exclusive')
  process.exit(1)
}

if (outFlag && (updateSnapshots || matchSnapshot)) {
  console.error('error: --out cannot be used with --update-snapshots or --match-snapshot')
  process.exit(1)
}

if (outFlag && inputPaths.length > 1) {
  console.error('error: --out can only be used with a single input file')
  process.exit(1)
}

if (runTypecheck) {
  const jsFiles = inputPaths.filter(f => extname(f) === '.js')
  if (jsFiles.length) {
    console.error(`error: --typecheck requires .ts files; received: ${jsFiles.join(', ')}`)
    process.exit(1)
  }
}

// --- Typecheck ---
// NOTE: Moved into executeTasks() to run on each regeneration when --watch is used

// --- Run tests ---
// NOTE: Moved into executeTasks() to run on each regeneration when --watch is used

// --- Generate markdown ---

async function generateMarkdown(): Promise<void> {
  let filesGenerated = 0
  
  for (const inputPath of inputPaths) {
    // Reset the describe format override before processing each file
    resetDescribeFormat()
    
    // Import the file to allow module-level setup (like setDescribeFormat calls)
    const absolutePath = resolve(inputPath)
    try {
      // Suppress test output during import and test execution
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
        await import(absolutePath)
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
      // File might not be valid JavaScript/TypeScript module, continue
    }
    
    const src = readFileSync(inputPath, 'utf8')
    const lang = extname(inputPath) === '.js' ? 'javascript' : 'typescript'
    let nodes = parse(src, lang, inputPath)
    if (!dryrun) {
      nodes = resolveOutputFiles(nodes)
    }
    // Use resolved format (CLI value + file override)
    const finalDescribeFormat = resolveDescribeFormat(describeFormat)
    const md = render(nodes, finalDescribeFormat)

    let outPath: string | null = null
    let isStdout = false
    if (updateSnapshots) {
      const outputFileName = getOutputFileName(inputPath)
      const fileNameWithoutMd = outputFileName.slice(0, -3) // Remove .md
      outPath = join(dirname(resolve(inputPath)), `${fileNameWithoutMd}.snapshot.md`)
    } else if (matchSnapshot) {
      // When matching snapshots, suppress stdout output
      const snapshotDir = outputDir || dirname(resolve(inputPath))
      const outputFileName = getOutputFileName(inputPath)
      const fileNameWithoutMd = outputFileName.slice(0, -3) // Remove .md
      outPath = join(snapshotDir, `${fileNameWithoutMd}.snapshot.md`)
    } else if (outFlag) {
      outPath = outFlag
    } else if (outputDir) {
      mkdirSync(outputDir, { recursive: true })
      outPath = join(outputDir, getOutputFileName(inputPath))
    } else {
      isStdout = true
    }

    if (dryrun) {
      if (isStdout) {
        console.error(`dry run: would write to stdout`)
      } else {
        console.error(`dry run: would write ${outPath}`)
      }
    } else if (isStdout) {
      process.stdout.write(md + '\n')
    } else {
      writeFileSync(outPath!, md + '\n', 'utf8')
      filesGenerated++
    }
  }
  
  // Show summary if files were written
  if (!dryrun && filesGenerated > 0) {
    const fileWord = filesGenerated === 1 ? 'file' : 'files'
    console.error(`✅ Generated ${filesGenerated} ${fileWord}`)
  }
}

async function executeTasks(): Promise<void> {
  // Run typecheck before generation (if enabled)
  if (runTypecheck) {
    const result = typecheck(inputPaths.map(p => resolve(p)))
    if (!result.ok) {
      for (const msg of result.messages) console.error(msg)
      console.error('❌ Typecheck failed')
      // In watch mode, report error but continue; in normal mode, exit
      if (!watch) process.exit(1)
      // Continue to markdown generation even if typecheck failed
    } else {
      console.error('✅ Typecheck passed')
    }
  }

  // Run tests before generation (if enabled)
  if (runTests) {
    // Build a map of commands to their source file locations
    const commandMap = buildCommandLineMap(inputPaths)
    
    const stripFlag = stripTypesFlag()
    const nodeArgs = ['--test', ...(stripFlag ? [stripFlag] : []), ...inputPaths.map(p => resolve(p))]
    
    // Always capture output to check for async errors, but show it in normal mode
    const result = spawnSync(process.execPath, nodeArgs, { encoding: 'utf-8' as const })
    
    // Show output in normal (non-watch) mode with cleaned stack traces and line numbers
    if (!watch) {
      if (result.stdout) {
        let output = cleanTestFailureOutput(result.stdout)
        output = enhanceTestOutputWithLineNumbers(output, commandMap)
        process.stdout.write(output ? output + '\n' : result.stdout)
      }
      if (result.stderr) process.stderr.write(result.stderr)
    }
    
    // Combine stdout and stderr for analysis
    const fullOutput = ((result.stdout || '') + '\n' + (result.stderr || ''))
    
    // Handle output based on mode
    let stats = parseTestSummary(fullOutput)
    if (watch && result.stdout) {
      // In watch mode: show condensed summary instead of full output
      let output = result.stdout.toString()
      stats = parseTestSummary(output)
      
      if (stats.hasFailed) {
        // Extract and show failures section with cleaned output and line numbers
        const failureStart = output.indexOf('✖ failing tests')
        if (failureStart !== -1) {
          let failureSection = output.substring(failureStart)
          failureSection = cleanTestFailureOutput(failureSection)
          failureSection = enhanceTestOutputWithLineNumbers(failureSection, commandMap)
          console.error(failureSection)
        }
        console.error(`\n❌ Tests failed: ${stats.failed}/${stats.total} failed`)
      } else {
        // All passed: show one-line summary
        console.log(`✅ Tests passed: ${stats.passed} passed`)
      }
    }
    
    if (result.status !== 0 || stats.hasFailed) {
      const exitCode = result.status !== 0 ? result.status : 1
      // In watch mode, report error but continue; in normal mode, exit
      if (!watch) process.exit(exitCode ?? 1)
      // Continue to markdown generation even if tests failed
    }
  }

  // Generate markdown (always do this, even if tests/typecheck failed)
  await generateMarkdown()

  // Run snapshot matching after generation (if enabled)
  if (matchSnapshot) {
    const snapshotDir = outputDir || inputPaths.map(p => dirname(resolve(p)))[0] || process.cwd()
    const result = await matchSnapshots(inputPaths.map(p => resolve(p)), snapshotDir, describeFormat)
    
    if (result.failed > 0) {
      // Show errors
      for (const error of result.errors) {
        if (error.message.includes('\n')) {
          // It's a diff
          console.error(`\n✖ ${error.file}:\n${error.message}`)
        } else {
          // It's an error message
          console.error(`✖ ${error.file}: ${error.message}`)
        }
      }
      console.error(`\n❌ Snapshot validation failed: ${result.failed}/${result.total} failed`)
      // In watch mode, report error but continue; in normal mode, exit
      if (!watch) process.exit(1)
      // Continue watch loop even if snapshots failed
    } else {
      if (watch) {
        console.error(`✅ Snapshots matched: ${result.passed} passed`)
      } else {
        console.error(`✅ Snapshots matched: ${result.passed} passed`)
      }
    }
  }
}

;(async () => {
  await executeTasks()

  // If --watch flag is set and we're in an interactive terminal, enter the watch loop
  if (watch && process.stdin.isTTY) {
    while (true) {
      const trigger = await watchFilesAndWait(inputPaths)
      // On spacebar or file change, regenerate
      await executeTasks()
    }
  }
})()



