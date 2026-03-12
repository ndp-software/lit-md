import {alias, describe, stripTypesFlag, shellExample} from '../index.ts'

const _flag = stripTypesFlag()
alias('lit-md', ['node', _flag, './src/cli.ts'].filter(Boolean).join(' '))

describe('CLI', () => {
  // By default, output is written to stdout.
  shellExample('lit-md tmp.ts', {
    displayCommand: true,
    inputFiles: [{
      path: 'tmp.ts',
      content: `import { example } from 'node:test'
      
// # My Documentation
      
example('test', () => {
  const a = 0.5
  const b = 0.25
  const c = a + b
})`
    }],
    stdout: {
      contains: '# My Documentation',
      display: true
    }
  })

// ### Running (as) Tests
// Use --test to run tests before generating markdown.
// ```
// $ lit-md --test tmp.ts
// ```
// Failing tests will prevent (flawed) markdown generation.

// ### Type Checking
// Use --typecheck to validate TypeScript before generating markdown.
// ```sh
// $ lit-md --typecheck tmp.ts
// ```
// ### Watch Mode
// Use --watch to automatically regenerate when files change. Press space to regenerate manually, Ctrl+C to exit.
// ```sh
// $lit-md --watch tmp.ts
// ```

  describe('Describe Formats', () => {
    // There are two approaches to building out **lit-md** files: with or without describe blocks.
    // #### Without Describe blocks
    // Although **lit-md** files are test files, there's no need to use `describe` blocks 
    // to nest or group your checks. Your source files will look more like traditional documentation
    // if comment lines and hash marks are use, eg. `// ### Contributing`.
    //
    // #### With Describe blocks
    // Describe blocks can also be used like they are in test suites.
    // By default, top-level `describe()` descriptions become H2 headers, and describes inside describes
    // become H3s, etc.
    shellExample('lit-md tmp.ts', {
      displayCommand: true,
      inputFiles: [{
        path: 'tmp.ts',
        content: `
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
})`
      }],
      stdout: {
        contains: '### Advanced',
        display: true
      }
    })

    // To change what the top-level heading is used for the top level describe, use the `--describe`
    // command line option. For example, to start with `H3s`, use:
    // ```sh
    // $ lit-md --describe="###" myfile.ts
    // ```
    // Describe blocks can be ignored completely using `--describe=hidden`:

    // Only the `example`s will appear in the markdown.
    shellExample('lit-md --describe=hidden tmp.ts', {
      displayCommand: true,
      inputFiles: [{
        path: 'tmp.ts',
        content: `
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
})`
      }],
      stdout: {
        contains: '# My API',
        display: true
      }
    })


    describe('auto format', () => {
      // The `auto` format adapts header levels to document structure.
      // It starts at h1 if no headers exist, or one level deeper than the last header.
      shellExample('lit-md --describe="auto" tmp.ts', {
        displayCommand: true,
        inputFiles: [{
          path: 'tmp.ts',
          content: `
// ### My API
// Some introduction text\nimport { describe, example } from 'node:test'
import assert from 'node:assert/strict'
describe('Math Functions', () => {
  example('addition', () => {
    assert.equal(1 + 1, 2)
  })
})`
        }],
        stdout: {
          contains: '#### Math Functions',
          display: true
        }
      })
    })
  })

  describe('Snapshot Matching', () => {
    // Use --match-snapshot to validate generated markdown against an existing snapshot file.
    // For convenience (and to mirror other snapshot tools), snapshots are auto-generated if missing.
    // ```sh
    // $ lit-md --match-snapshot tmp.ts
    // ```

    // Combine --match-snapshot with --watch for continuous validation during development.
    // ```sh
    // $ lit-md --match-snapshot --watch tmp.
    // ```
  })

  // ### Output Modes
  // #### Dry-run preview
  // Use --dryrun to preview what would be generated and written without actually writing files.
  // ```sh
  // $ lit-md --dryrun --outDir ./docs tmp.ts
  // ```

  // #### Write to directory
  // Use --outDir to write generated markdown files to a specific directory. Filenames are derived from input files.
  // ```sh
  // $ lit-md --outDir ./docs tmp.ts
  // ```

  describe('Common Combinations', () => {
// #### Full validation pipeline
// Combine --test, --typecheck, and --watch for a complete development workflow with continuous validation.
// ```sh
// $ lit-md --test --typecheck --watch tmp.ts
// ```

    describe('single file output with testing', () => {
      // Combine --test with --out to run tests and write to a specific markdown file.
      shellExample('lit-md --test --out /tmp/docs.md tmp.ts', {
        displayCommand: true,
        inputFiles: [{
          path: 'tmp.ts',
          content: `// # My Docs\n// \n// This documentation was generated with --test validation.\n`
        }],
        outputFiles: [{
          path: '/tmp/docs.md',
          contains: '# My Docs'
        }]
      })
    })

    describe('validate multiple files', () => {
      // Use --match-snapshot with glob patterns to validate multiple test files at once.
      shellExample('lit-md --match-snapshot tmp.ts', {
        displayCommand: true,
        inputFiles: [{
          path: 'tmp.ts',
          content: `// # API\nimport { example } from 'node:test'\nexample('endpoint', () => {})`
        }],
        stdout: {
          display: false
        }
      })
    })
  })

  describe('Custom output path', () => {
    // Use --out to write to a different location.
    shellExample('lit-md tmp.ts --out /tmp/docs.md', {
      displayCommand: true,
      inputFiles: [{
        path: 'tmp.ts',
        content: `// # Documentation\nimport { example } from 'node:test'`
      }],
      outputFiles: [{
        path: '/tmp/docs.md',
        contains: '# Documentation'
      }]
    })
  })

  describe('Help', () => {
    // Use `lit-md --help` for options.
    shellExample('lit-md --help', {
      displayCommand: true,
      stdout: {
        display: true
      }
    })
  })
})
