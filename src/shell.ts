import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync, unlinkSync, mkdtempSync, rmSync, existsSync } from 'node:fs'
import { isAbsolute, resolve, join, dirname, extname } from 'node:path'
import { tmpdir } from 'node:os'
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { ShellExampleError } from './error-context.ts'

export { test as example, test as metaExample, describe } from 'node:test'

// Module-level alias registry: name → resolved shell command string
const _aliases = new Map<string, string>()

/**
 * Register a shell alias. `cmdString` may be a plain path or a command with
 * arguments (e.g. `'node --experimental-strip-types ./cli.ts'`). Any token
 * that looks like a file path (contains `/` or starts with `.`) is resolved
 * relative to `process.cwd()` at call time. The resulting alias is prepended
 * to every shell command executed by `shellExample`.
 *
 * Alias calls produce **no markdown output**.
 */
export function alias(name: string, cmdString: string): void {
  const resolved = resolveCmdPath(cmdString)
  _aliases.set(name, resolved)
}

/** Internal: clear all registered aliases. Used in tests for isolation. */
export function _clearAliases(): void {
  _aliases.clear()
}

/** Resolve path-like tokens in a command string to absolute paths. */
function resolveCmdPath(cmdString: string): string {
  return cmdString.replace(/\S+/g, token => {
    if (token.startsWith('/') || token.startsWith('./') || token.startsWith('../') ||
        (!isAbsolute(token) && token.includes('/'))) {
      return resolve(process.cwd(), token)
    }
    return token
  })
}

/** Build shell alias prefix lines to prepend to commands. */
export function buildAliasPrefix(): string {
  if (_aliases.size === 0) return ''
  const lines = [..._aliases.entries()].map(([name, cmd]) => `alias ${name}='${cmd}'`)
  return lines.join('\n') + '\n'
}

/** Check if content matches a pattern (string or regex). */
function matchesPattern(content: string, pattern: string | RegExp): boolean {
  return pattern instanceof RegExp ? pattern.test(content) : content.includes(pattern)
}

export interface ShellFileAssertion {
  path: string
  contains?: string | RegExp
  matches?: string | RegExp
  displayPath?: boolean | 'hidden'
  summary?: boolean
}

type ExampleInputFile = {
  path: string;
  content: string;
  displayPath?: boolean | 'hidden';
  display?: boolean | 'hidden';
  summary?: boolean
}

export interface ShellExampleOpts {
  stdout?: { contains?: string | RegExp; matches?: string | RegExp; display?: boolean }
  outputFiles?: ShellFileAssertion[]
  inputFiles?: Array<ExampleInputFile>
  displayCommand?: boolean | 'hidden'
  meta?: boolean
  exitCode?: number
  timeout?: number  // Timeout in milliseconds, default 3000
  // Internal: source location for error reporting
  _sourceLocation?: { filePath: string; line: number; column: number }
}

/** Internal: executes a shell command and runs any assertions. Throws on failure.
 *  Exported for direct testing. */
export function _runShellExample(cmd: string, opts: ShellExampleOpts): void {
  const tmpDir = mkdtempSync(join(tmpdir(), 'lit-md-shell-'))
  const resolvePath = (p: string) => isAbsolute(p) ? p : join(tmpDir, p)
  try {
    for (const f of opts.inputFiles ?? []) {
      writeFileSync(resolvePath(f.path), f.content, 'utf8')
    }
    const prefix = buildAliasPrefix()
    const fullCmd = prefix ? `${prefix}${cmd}` : cmd
    const timeoutMs = opts.timeout ?? 3000
    const result = spawnSync(fullCmd, { shell: true, encoding: 'utf8', cwd: tmpDir, timeout: timeoutMs })
    
    // Check for timeout error
    if (result.error && (result.error as NodeJS.ErrnoException).code === 'ETIMEDOUT') {
      const errMsg = `Command timed out after ${timeoutMs}ms: ${cmd}`
      if (opts._sourceLocation) {
        throw new ShellExampleError(errMsg, {
          filePath: opts._sourceLocation.filePath,
          line: opts._sourceLocation.line,
          column: opts._sourceLocation.column
        })
      } else {
        throw new Error(errMsg)
      }
    }
    
    const actualExitCode = result.status ?? 1
    if (opts.exitCode !== undefined) {
      if (actualExitCode !== opts.exitCode) {
        const err = result.stderr || result.error?.message || ''
        const errMsg = `Command failed: ${cmd}\nexit ${actualExitCode} (expected exit code ${opts.exitCode})${err ? ': ' + err : ''}`
        
        if (opts._sourceLocation) {
          throw new ShellExampleError(errMsg, {
            filePath: opts._sourceLocation.filePath,
            line: opts._sourceLocation.line,
            column: opts._sourceLocation.column
          })
        } else {
          throw new Error(errMsg)
        }
      }
    } else if (actualExitCode !== 0) {
      const err = result.stderr || result.error?.message || ''
      const errMsg = `Command failed: ${cmd}\nexit ${actualExitCode}${err ? ': ' + err : ''}`
      
      if (opts._sourceLocation) {
        throw new ShellExampleError(errMsg, {
          filePath: opts._sourceLocation.filePath,
          line: opts._sourceLocation.line,
          column: opts._sourceLocation.column
        })
      } else {
        throw new Error(errMsg)
      }
    }
    const stdout = result.stdout
    if (opts.stdout !== undefined) {
      // If display is true, stdout must not be empty
      if (opts.stdout.display && (!stdout || stdout.trim() === '')) {
        throw new Error(`stdout.display: true but command produced no output (exit code: ${actualExitCode})`)
      }
      if (opts.stdout.contains !== undefined) {
        const actualDesc = stdout === '' ? '(empty)' : stdout
        assert.ok(
          matchesPattern(stdout, opts.stdout.contains),
          `stdout did not contain: ${JSON.stringify(opts.stdout.contains)}\nActual: ${actualDesc}`
        )
      }
      if (opts.stdout.matches !== undefined) {
        const actualDesc = stdout === '' ? '(empty)' : stdout
        assert.ok(
          matchesPattern(stdout, opts.stdout.matches),
          `stdout did not match: ${opts.stdout.matches}\nActual: ${actualDesc}`
        )
      }
    }
    for (const fa of opts.outputFiles ?? []) {
      let content: string
      try {
        content = readFileSync(resolvePath(fa.path), 'utf8')
      } catch (e) {
        const err = e as NodeJS.ErrnoException
        if (err.code === 'ENOENT') {
          throw new Error(`Output file not found: ${fa.path}\n\nThe command may not have created this file, or it may be in a different location.\nCommand: ${cmd}`)
        }
        throw e
      }
      const actualDesc = content === '' ? '(empty)' : content
      if (fa.contains !== undefined) {
        assert.ok(
          matchesPattern(content, fa.contains),
          `file ${fa.path} does not contain: ${JSON.stringify(fa.contains)}\nActual:\n${actualDesc}`
        )
      }
      if (fa.matches !== undefined) {
        assert.ok(
          matchesPattern(content, fa.matches),
          `file ${fa.path} does not match: ${fa.matches}\nActual:\n${actualDesc}`
        )
      }
    }
    // Clean up absolute-path inputFiles (relative ones are removed with tmpDir below)
    for (const f of opts.inputFiles ?? []) {
      if (isAbsolute(f.path)) try { unlinkSync(f.path) } catch {}
    }
  } finally {
    rmSync(tmpDir, { recursive: true, force: true })
  }
}



/** Registers a node:test test that executes the shell command and verifies assertions. */
export function shellExample(cmd: string, opts: ShellExampleOpts = {}): void {
  const timeoutMs = opts.timeout ?? 3000
  test(cmd, { timeout: timeoutMs }, () => _runShellExample(cmd, opts))
}

/**
 * Returns `'--experimental-strip-types'` on Node.js versions where the flag is required
 * (v22.6–v23.5), or `''` on versions where TypeScript stripping is stable (v23.6+).
 */
export function stripTypesFlag(): string {
  const parts = process.versions.node.split('.')
  const major = parseInt(parts[0] ?? '0', 10)
  const minor = parseInt(parts[1] ?? '0', 10)
  if (major === 22 && minor >= 6) return '--experimental-strip-types'
  if (major === 23 && minor < 6) return '--experimental-strip-types'
  return ''
}

/**
 * Extract import paths from a TypeScript/JavaScript file using regex.
 * Returns absolute paths to files that could be imported.
 */
function extractImportPaths(filePath: string, baseDir: string): Set<string> {
  const importedPaths = new Set<string>()
  try {
    const content = readFileSync(filePath, 'utf8')
    
    // Match import statements: import ... from 'path' or "path"
    const importRegex = /import\s+(?:(?:{[^}]*})|(?:\*\s+as\s+\w+)|(?:\w+))?(?:\s*,\s*(?:{[^}]*}|\*\s+as\s+\w+|\w+))*\s+from\s+['"]([^'"]+)['"]/g
    
    // Match require statements: require('path') or require("path")
    const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g
    
    let match
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1]
      if (importPath && !importPath.startsWith('.') && !importPath.startsWith('/')) {
        // Skip node_modules and absolute imports
        continue
      }
      const resolved = resolveImportPath(importPath, baseDir)
      if (resolved) importedPaths.add(resolved)
    }
    
    while ((match = requireRegex.exec(content)) !== null) {
      const importPath = match[1]
      if (importPath && !importPath.startsWith('.') && !importPath.startsWith('/')) {
        continue
      }
      const resolved = resolveImportPath(importPath, baseDir)
      if (resolved) importedPaths.add(resolved)
    }
  } catch {
    // If we can't read the file, skip it
  }
  
  return importedPaths
}

/**
 * Resolve an import path to an actual file path.
 * Handles .ts, .js, .tsx, .jsx extensions and directory index files.
 */
function resolveImportPath(importPath: string, baseDir: string): string | null {
  const basePath = resolve(baseDir, importPath)
  
  // Try the path as-is
  if (existsSync(basePath)) return basePath
  
  // Try with common extensions
  for (const ext of ['.ts', '.tsx', '.js', '.jsx']) {
    if (existsSync(basePath + ext)) {
      return basePath + ext
    }
  }
  
  // Try as a directory with index file
  for (const indexFile of ['index.ts', 'index.tsx', 'index.js', 'index.jsx']) {
    const indexPath = join(basePath, indexFile)
    if (existsSync(indexPath)) {
      return indexPath
    }
  }
  
  return null
}

/**
 * Recursively collect all dependencies of input files.
 * Returns a set of all files that should be watched.
 */
function collectAllDependencies(inputPaths: string[], visited = new Set<string>()): Set<string> {
  const allDeps = new Set<string>(inputPaths.map(p => resolve(p)))
  const toProcess = [...inputPaths]
  
  while (toProcess.length > 0) {
    const current = toProcess.shift()!
    const resolvedCurrent = resolve(current)
    
    if (visited.has(resolvedCurrent)) continue
    visited.add(resolvedCurrent)
    
    const deps = extractImportPaths(resolvedCurrent, dirname(resolvedCurrent))
    for (const dep of deps) {
      allDeps.add(dep)
      if (!visited.has(dep)) {
        toProcess.push(dep)
      }
    }
  }
  
  return allDeps
}

/**
 * Watch input files for changes and listen for keyboard input.
 * Returns 'spacebar' if user presses spacebar, or 'filechange' if a file changes.
 * Exit cleanly on Ctrl+C (SIGINT). Gracefully handles non-TTY environments by
 * resolving immediately.
 */
export async function watchFilesAndWait(inputPaths: string[]): Promise<'spacebar' | 'filechange'> {
  // Check if stdin is a TTY (interactive terminal)
  if (!process.stdin.isTTY) {
    // Non-interactive environment: resolve immediately without waiting
    return 'spacebar'
  }

  const { watch } = await import('node:fs')

  let lastChangeTime = 0
  const DEBOUNCE_MS = 300
  let changeDetected = false

  // Collect all dependencies to watch, not just the input files
  const filesToWatch = collectAllDependencies(inputPaths)

  const watchers = Array.from(filesToWatch).map(filePath => {
    return watch(filePath, (eventType) => {
      const now = Date.now()
      // Debounce: only consider changes if enough time has passed
      if (now - lastChangeTime >= DEBOUNCE_MS) {
        lastChangeTime = now
        changeDetected = true
      }
    })
  })

  // Set up signal handlers for clean exit
  const exitHandler = () => {
    watchers.forEach(w => w.close())
    process.stdin.setRawMode(false)
    process.exit(0)
  }

  process.on('SIGINT', exitHandler)
  process.on('SIGTERM', exitHandler)

  // Display wait message
  console.error('Press space to regenerate, q to quit...')

  // Set raw mode to detect individual key presses
  process.stdin.setRawMode(true)
  process.stdin.resume()

  return new Promise<'spacebar' | 'filechange'>(resolve => {
    const onData = (data: Buffer) => {
      const char = data[0]
      // 0x20 is the spacebar
      if (char === 0x20) {
        cleanup()
        resolve('spacebar')
      } else if (char === 0x03 || char === 0x71 || char === 0x78 || char === 0x1b) {
        // Ctrl+C (0x03), q (0x71), x (0x78), or esc (0x1b)
        cleanup()
        process.exit(0)
      }
    }

    const checkForChanges = setInterval(() => {
      if (changeDetected) {
        cleanup()
        console.error('Files changed, regenerating...')
        resolve('filechange')
      }
    }, 50)

    const cleanup = () => {
      process.stdin.off('data', onData)
      clearInterval(checkForChanges)
      process.stdin.setRawMode(false)
      process.stdin.pause()
      process.removeListener('SIGINT', exitHandler)
      process.removeListener('SIGTERM', exitHandler)
      watchers.forEach(w => w.close())
    }

    process.stdin.on('data', onData)
  })
}
