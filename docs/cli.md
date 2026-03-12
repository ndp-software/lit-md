## CLI

By default, output is written to stdout.

```ts
// Input file "tmp.ts":
import { example } from 'node:test'

// # My Documentation

example('test', () => {
  const a = 0.5
  const b = 0.25
  const c = a + b
})
```

````sh
$ lit-md tmp.ts
# My Documentation
```ts
const a = 0.5
const b = 0.25
const c = a + b
```
````

### Running (as) Tests
Use --test to run tests before generating markdown.
```
$ lit-md --test tmp.ts
```
Failing tests will prevent (flawed) markdown generation.

### Type Checking
Use --typecheck to validate TypeScript before generating markdown.
```sh
$ lit-md --typecheck tmp.ts
```
### Watch Mode
Use --watch to automatically regenerate when files change. Press space to regenerate manually, Ctrl+C to exit.
```sh
$lit-md --watch tmp.ts
```

### Describe Formats

There are two approaches to building out **lit-md** files: with or without describe blocks.
#### Without Describe blocks
Although **lit-md** files are test files, there's no need to use `describe` blocks 
to nest or group your checks. Your source files will look more like traditional documentation
if comment lines and hash marks are use, eg. `// ### Contributing`.

#### With Describe blocks
Describe blocks can also be used like they are in test suites.
By default, top-level `describe()` descriptions become H2 headers, and describes inside describes
become H3s, etc.

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
$ lit-md tmp.ts
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

To change what the top-level heading is used for the top level describe, use the `--describe`
command line option. For example, to start with `H3s`, use:
```sh
$ lit-md --describe="###" myfile.ts
```
Describe blocks can be ignored completely using `--describe=hidden`:

Only the `example`s will appear in the markdown.

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

#### auto format

The `auto` format adapts header levels to document structure.
It starts at h1 if no headers exist, or one level deeper than the last header.

```ts
// Input file "tmp.ts":
// ### My API
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
### My API
Some introduction text

#### Math Functions

```ts
1 + 1 // => 2
```
````

### Snapshot Matching

### Output Modes
#### Dry-run preview
Use --dryrun to preview what would be generated and written without actually writing files.
```sh
$ lit-md --dryrun --outDir ./docs tmp.ts
```

#### Write to directory
Use --outDir to write generated markdown files to a specific directory. Filenames are derived from input files.
```sh
$ lit-md --outDir ./docs tmp.ts
```

### Common Combinations

#### Full validation pipeline
Combine --test, --typecheck, and --watch for a complete development workflow with continuous validation.
```sh
$ lit-md --test --typecheck --watch tmp.ts
```

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
