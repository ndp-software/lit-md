# Change Log

## [Unreleased]

## Added

- Support for additional code example identifiers: `spec` and `it` as aliases for `test`, and `context` and `suite` as aliases for `describe`. These are exported from the package and work identically to their counterparts, providing flexibility for different testing styles and naming conventions. (Engine)
- Type definitions are now exported: `CodeNode`, `DescribeNode`, and `ProseNode` for better TypeScript support when using lit-md programmatically. (Engine)

## Breaking Changes

- **CLI**: Renamed `--wait` flag to `--watch` for consistency with common CLI conventions (webpack, esbuild, TypeScript, etc.). This flag enables watch mode, which automatically regenerates output when input files change. Update scripts and CI/CD configurations that use `lit-md --wait` to use `lit-md --watch` instead.

## Fixed

- **CLI**: Snapshot matching regression where `--match-snapshot` was silently updating snapshots instead of validating them. The issue occurred because snapshots were written to disk during markdown generation, then validation compared the generated content against the file that was just written (comparing against itself). Now `--match-snapshot` only validates without writing files - snapshots are only written when using `-u` (update) flag or when auto-generating missing snapshots. Added permanent regression test (`test/snapshot-regression.test.ts`) to prevent this issue from recurring.

## [0.4] - 2026-03-09

## Added

- **Engine** Deal better with shellExample command failures. When a shell command fails (non-zero exit code or timeout), the error message now includes the full command output (stdout and stderr) for easier debugging. If the output is empty, it will say `(empty)` instead of showing an empty diff. This provides clearer feedback on what went wrong with the command.


## [0.3] - 2026-03-08

## Added

- **Engine**: `timeout` option for `shellExample()`: Prevents test hangs from long-running or infinite shell commands with a configurable timeout (default: 3000ms). For example, `shellExample('npm install', { timeout: 30000 })` allows 30 seconds. Timeouts result in clear error messages like "Command timed out after 3000ms: sleep 10", with proper resource cleanup.

- **CLI**: Visual feedback indicators for all operations. Watch mode and normal mode now display `✅ Typecheck passed` or `❌ Typecheck failed` for type checking results, and `✅ Generated N file(s)` for markdown generation, providing consistent visual feedback alongside test results.

- **CLI**: Additional exit keys for watch mode (`--watch`). Users can now exit watch mode by pressing `q`, `x`, or `esc` in addition to `Ctrl+C`, making it more intuitive and accessible.

- **Engine**: Colored and contextual typecheck error output using TypeScript's `formatDiagnosticsWithColorAndContext()`. Type errors now display with red highlighting, line numbers, and surrounding code context for better visibility and debugging.

- `exitCode` option for `shellExample()`: Assert the command exits with a specific exit code. For example, `shellExample('ls /nonexistent', { exitCode: 2 })` verifies the command exits with code 2. Commands with a non-zero `exitCode` display a `# exits: N` annotation in the generated `sh` block.

- `meta` option for `shellExample()`: When set to `true`, outputs a fenced code block showing the `shellExample` call itself before the command output, with the `meta: true` option removed for cleaner documentation.

## Fixed

- **Engine**: `shellExample` assertion failures on `outputFiles.contains` and `outputFiles.matches` now include the actual file content in the error message. When the file is empty, the message says `(empty)` instead of showing a confusing empty diff.

- **Engine**: `shellExample` with `meta: true` now correctly escapes backslashes and special characters (e.g. `\n`, `\r`) in the command string when reconstructing the TypeScript `shellExample(...)` call. Previously, a command containing a literal backslash could generate invalid TypeScript.

