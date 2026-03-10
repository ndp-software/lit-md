# Change Log

## [Unreleased]

## Fixed

- **CLI**: Asynchronous errors (unhandled rejections and exceptions) that occur after tests complete are now properly detected and cause the process to exit with a failure status (non-zero exit code). This ensures that errors like "A resource generated asynchronous activity after the test ended" are displayed as red failure indicators instead of being silently ignored. The CLI now also installs global error handlers to catch any unhandled errors and report them immediately.

## [0.4] - 2026-03-09

## Added

- **Engine** Deal better with shellExample command failures. When a shell command fails (non-zero exit code or timeout), the error message now includes the full command output (stdout and stderr) for easier debugging. If the output is empty, it will say `(empty)` instead of showing an empty diff. This provides clearer feedback on what went wrong with the command.


## [0.3] - 2026-03-08

## Added

- **Engine**: `timeout` option for `shellExample()`: Prevents test hangs from long-running or infinite shell commands with a configurable timeout (default: 3000ms). For example, `shellExample('npm install', { timeout: 30000 })` allows 30 seconds. Timeouts result in clear error messages like "Command timed out after 3000ms: sleep 10", with proper resource cleanup.

- **CLI**: Visual feedback indicators for all operations. Watch mode and normal mode now display `✅ Typecheck passed` or `❌ Typecheck failed` for type checking results, and `✅ Generated N file(s)` for markdown generation, providing consistent visual feedback alongside test results.

- **CLI**: Additional exit keys for watch mode (`--wait`). Users can now exit watch mode by pressing `q`, `x`, or `esc` in addition to `Ctrl+C`, making it more intuitive and accessible.

- **Engine**: Colored and contextual typecheck error output using TypeScript's `formatDiagnosticsWithColorAndContext()`. Type errors now display with red highlighting, line numbers, and surrounding code context for better visibility and debugging.

- `exitCode` option for `shellExample()`: Assert the command exits with a specific exit code. For example, `shellExample('ls /nonexistent', { exitCode: 2 })` verifies the command exits with code 2. Commands with a non-zero `exitCode` display a `# exits: N` annotation in the generated `sh` block.

- `meta` option for `shellExample()`: When set to `true`, outputs a fenced code block showing the `shellExample` call itself before the command output, with the `meta: true` option removed for cleaner documentation.

## Fixed

- **Engine**: `shellExample` assertion failures on `outputFiles.contains` and `outputFiles.matches` now include the actual file content in the error message. When the file is empty, the message says `(empty)` instead of showing a confusing empty diff.

- **Engine**: `shellExample` with `meta: true` now correctly escapes backslashes and special characters (e.g. `\n`, `\r`) in the command string when reconstructing the TypeScript `shellExample(...)` call. Previously, a command containing a literal backslash could generate invalid TypeScript.

