## CLI

By default, output is written to stdout.

```ts
// Input file "tmp.ts":
// # My Document
import { example } from 'node:test'
example('test', () => {})
```

```sh
$ lit-md tmp.ts
# My Document
```

### Custom output path

Use --out to write to a different location.

```ts
// Input file "tmp.ts":
// # Documentation
import { example } from 'node:test'
```

```sh
$ lit-md tmp.ts --out /tmp/docs.md
```

Output file `/tmp/docs.md` contains `# Documentation`.

### Help

Use `lit-md --help` for options.

```sh
$ lit-md --help
lit-md - Generate markdown documentation from test files

Usage: lit-md [options] <file.ts|js> [file2 ...]

Options:
  --help, -h                Show this help message
  --test                    Run tests before generating markdown
  --typecheck               Run type checking before generating markdown
  --dryrun                  Show what would be written without writing files
  -u, --update-snapshots    Update snapshot files instead of generating markdown
  --wait                    After generating, keep the process alive and watch for file
                             changes. Press space to manually regenerate, Ctrl+C to exit.
                             Works with --test and --typecheck (reruns on each change).
  --out <output.md>         Write to a specific output file (requires single input)
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
  lit-md --wait README.md.test.ts                           # outputs to stdout, then waits for changes
  lit-md --out /tmp/docs.md README.md.test.ts               # writes to file
  lit-md --outDir ./docs src/**/*.md.test.ts                # writes to directory
  lit-md --describe="#" README.md.test.ts                   # outputs to stdout with custom format
  lit-md --describe="auto" README.md.test.ts                # outputs to stdout with auto format
```
