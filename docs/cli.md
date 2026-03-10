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

### Running Tests

Use --test to run tests before generating markdown.

```ts
// Input file "tmp.ts":

        import {test as example} from 'node:test'
        import assert from 'node:assert'
        // # Testing
        example('passing test', () => assert(true))
```

````sh
$ lit-md --test tmp.ts
✔ passing test (2.466748ms)
ℹ tests 1
ℹ suites 0
ℹ pass 1
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 726.584043
# Testing
```ts
assert(true)
```
ℹ tests 1
ℹ suites 0
ℹ pass 1
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 189.894967
````

Failed tests will prevent markdown generation.

```ts
// Input file "tmp.ts":

        import {test as example} from 'node:test'
        import assert from 'node:assert'
        // # Testing
        example('failing test', () => assert(true))
```

```sh
$ lit-md --test tmp.ts 2>/dev/null
# Testing
```

### Type Checking

Use --typecheck to validate TypeScript before generating markdown.

```sh
$ lit-md --typecheck tmp.ts
# TypeScript
```

### Watch Mode

Use --watch to automatically regenerate when files change. Press space to regenerate manually, Ctrl+C to exit.

```sh
$ lit-md --watch tmp.ts
# Watch Example
```

### Describe Formats

How describe() blocks are rendered in markdown is controlled by the --describe option.
By default, describe() blocks become H2 headers.
They can be ignored completely using `--describe=hidden`:

#### hidden format

Only examples appear in the markdown.

```ts
// Input file "tmp.ts":
// # My API
import { describe, example } from 'node:test'
import assert from 'node:assert/strict'
describe('Math Functions', () => {
  example('addition', () => {
    assert.equal(1 + 1, 2)
  })
  example('subtraction', () => {
    assert.equal(5 - 2, 3)
  })
})
```

````sh
$ lit-md --describe=hidden tmp.ts
# My API



```ts
1 + 1 // => 2

5 - 2 // => 3
```
````

#### ## (H2) format

The `##` format (default) renders describe() blocks as H2 headers.
Nested describes become H3, H4, etc.

```ts
// Input file "tmp.ts":
// # My API
import { describe, example } from 'node:test'
import assert from 'node:assert/strict'
describe('Math Functions', () => {
  example('addition', () => {
    assert.equal(1 + 1, 2)
  })
  describe('Advanced', () => {
    example('complex calc', () => {
      assert.equal((10 + 5) * 2, 30)
    })
  })
})
```

````sh
$ lit-md --describe="##" tmp.ts
# My API

## Math Functions

```ts
1 + 1 // => 2
```

### Advanced

```ts
(10 + 5) * 2 // => 30
```
````

#### auto format

The `auto` format adapts header levels to document structure. It starts at h1 if no headers exist, or one level deeper than the last header.

```ts
// Input file "tmp.ts":
// # My API
// Some introduction text
import { describe, example } from 'node:test'
import assert from 'node:assert/strict'
describe('Math Functions', () => {
  example('addition', () => {
    assert.equal(1 + 1, 2)
  })
})
```

````sh
$ lit-md --describe="auto" tmp.ts
# My API
Some introduction text

## Math Functions

```ts
1 + 1 // => 2
```
````

### Snapshot Matching

#### validate against snapshots

Use --match-snapshot to validate generated markdown against snapshot files.
Snapshots are auto-generated if missing.

```sh
$ lit-md --match-snapshot tmp.ts
```

#### watch and validate snapshots

Combine --match-snapshot with --watch for continuous validation during development.

```sh
$ lit-md --match-snapshot --watch tmp.ts
```

### Output Modes

#### dry-run preview

Use --dryrun to preview what would be generated and written without actually writing files.

```sh
$ lit-md --dryrun --outDir ./docs tmp.ts
# Input file `tmp.ts` contains `// # Preview`
```

#### write to directory

Use --outDir to write generated markdown files to a specific directory. Filenames are derived from input files.

```ts
// Input file "tmp.ts":
// # Documentation
import { example } from 'node:test'
example('sample', () => {})
```

```sh
$ lit-md --outDir ./docs tmp.ts
```

### Common Combinations

#### full validation pipeline

#### single file output with testing

Combine --test with --out to run tests and write to a specific markdown file.

```ts
// Input file "tmp.ts":
// # My Docs
// 
// This documentation was generated with --test validation.

```

```sh
$ lit-md --test --out /tmp/docs.md tmp.ts
```

Output file `/tmp/docs.md` contains `# My Docs`.

#### validate multiple files

Use --match-snapshot with glob patterns to validate multiple test files at once.

```ts
// Input file "tmp.ts":
// # API
import { example } from 'node:test'
example('endpoint', () => {})
```

```sh
$ lit-md --match-snapshot tmp.ts
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
```
