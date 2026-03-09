import ts from 'typescript'
import { join } from 'path'

export interface TypecheckResult {
  ok: boolean
  messages: string[]
}

export function typecheck(files: string[]): TypecheckResult {
  // Only look for tsconfig.json in the exact CWD (no upward walk).
  // This matches the user's expectation: run lit-md from the project root,
  // and if a tsconfig.json is there, it will be used.
  const tsConfigPath = join(process.cwd(), 'tsconfig.json')
  const configPath = ts.sys.fileExists(tsConfigPath) ? tsConfigPath : undefined

  let compilerOptions: ts.CompilerOptions

  if (configPath) {
    const configFile = ts.readConfigFile(configPath, ts.sys.readFile)
    if (configFile.error) {
      return { ok: false, messages: [ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n')] }
    }
    const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, ts.sys.getCurrentDirectory())
    compilerOptions = { ...parsed.options, noEmit: true }
  } else {
    // Sensible defaults when no tsconfig.json is present
    compilerOptions = {
      strict: true,
      noEmit: true,
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      target: ts.ScriptTarget.ESNext,
      allowImportingTsExtensions: true,
    }
  }

  const program = ts.createProgram(files, compilerOptions)
  const diagnostics = ts.getPreEmitDiagnostics(program)

  if (!diagnostics.length) return { ok: true, messages: [] }

  // Use TypeScript's built-in formatting with colors and context for better readability
  const formatted = ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: fileName => fileName,
    getCurrentDirectory: () => process.cwd(),
    getNewLine: () => '\n',
  })

  return { ok: false, messages: [formatted] }
}

