import {alias, describe, stripTypesFlag, shellExample} from '../index.ts'

const _flag = stripTypesFlag()
alias('lit-md', ['node', _flag, './src/cli.ts'].filter(Boolean).join(' '))

describe('CLI', () => {
  // By default, output is written to stdout.
  shellExample('lit-md tmp.ts', {
    displayCommand: true,
    inputFiles: [{
      path: 'tmp.ts',
      content: `// # My Document\nimport { example } from 'node:test'\nexample('test', () => {})`
    }],
    stdout: {
      contains: '# My Document',
      display: true
    }
  })

  describe('Running Tests', () => {
    // Use --test to run tests before generating markdown. Failed tests will prevent markdown generation.
    shellExample('lit-md --test tmp.ts', {
      displayCommand: true,
      inputFiles: [{
        path: 'tmp.ts',
        content: `// # Testing\n// \n// When you use --test, lit-md validates the code before generating markdown.\n`
      }],
      stdout: {
        contains: '# Testing',
        display: true
      }
    })
  })

  describe('Type Checking', () => {
    // Use --typecheck to validate TypeScript before generating markdown.
    shellExample('lit-md --typecheck tmp.ts', {
      displayCommand: true,
      inputFiles: [{
        path: 'tmp.ts',
        content: `// # TypeScript\nconst value: number = 42\n// Code that will pass typecheck\n// TypeScript validates the code\n`
      }],
      stdout: {
        contains: '# TypeScript',
        display: false
      }
    })
  })

  describe('Watch Mode', () => {
    // Use --watch to automatically regenerate when files change. Press space to regenerate manually, Ctrl+C to exit.
    shellExample('lit-md --watch tmp.ts', {
      displayCommand: true,
      inputFiles: [{
        path: 'tmp.ts',
        content: `// # Watch Example\nimport { example } from 'node:test'\nexample('auto-regenerate', () => {})`
      }],
      stdout: {
        contains: '# Watch Example',
        display: false
      }
    })
  })

  describe('Describe Formats', () => {
    describe('hidden format', () => {
      // The `hidden` format omits describe() block names from output. Only examples appear in the markdown.
      shellExample('lit-md --describe=hidden tmp.ts', {
        displayCommand: true,
        inputFiles: [{
          path: 'tmp.ts',
          content: `// # My API\nimport { describe, example } from 'node:test'\nimport assert from 'node:assert/strict'\ndescribe('Math Functions', () => {\n  example('addition', () => {\n    assert.equal(1 + 1, 2)\n  })\n  example('subtraction', () => {\n    assert.equal(5 - 2, 3)\n  })\n})`
        }],
        stdout: {
          contains: '# My API',
          display: true
        }
      })
    })

    describe('## (H2) format', () => {
      // The `##` format (default) renders describe() blocks as H2 headers. Nested describes become H3, H4, etc.
      shellExample('lit-md --describe="##" tmp.ts', {
        displayCommand: true,
        inputFiles: [{
          path: 'tmp.ts',
          content: `// # My API\nimport { describe, example } from 'node:test'\nimport assert from 'node:assert/strict'\ndescribe('Math Functions', () => {\n  example('addition', () => {\n    assert.equal(1 + 1, 2)\n  })\n  describe('Advanced', () => {\n    example('complex calc', () => {\n      assert.equal((10 + 5) * 2, 30)\n    })\n  })\n})`
        }],
        stdout: {
          contains: '## Math Functions',
          display: true
        }
      })
    })

    describe('auto format', () => {
      // The `auto` format adapts header levels to document structure. It starts at h1 if no headers exist, or one level deeper than the last header.
      shellExample('lit-md --describe="auto" tmp.ts', {
        displayCommand: true,
        inputFiles: [{
          path: 'tmp.ts',
          content: `// # My API\n// Some introduction text\nimport { describe, example } from 'node:test'\nimport assert from 'node:assert/strict'\ndescribe('Math Functions', () => {\n  example('addition', () => {\n    assert.equal(1 + 1, 2)\n  })\n})`
        }],
        stdout: {
          contains: '# My API',
          display: true
        }
      })
    })
  })

  describe('Snapshot Matching', () => {
    describe('validate against snapshots', () => {
      // Use --match-snapshot to validate generated markdown against snapshot files. Snapshots are auto-generated if missing.
      shellExample('lit-md --match-snapshot tmp.ts', {
        displayCommand: true,
        inputFiles: [{
          path: 'tmp.ts',
          content: `// # Feature\nimport { example } from 'node:test'\nexample('works', () => {})`
        }],
        stdout: {
          display: false
        }
      })
    })

    describe('watch and validate snapshots', () => {
      // Combine --match-snapshot with --watch for continuous validation during development.
      shellExample('lit-md --match-snapshot --watch tmp.ts', {
        displayCommand: true,
        inputFiles: [{
          path: 'tmp.ts',
          content: `// # Feature\nimport { example } from 'node:test'\nexample('works', () => {})`
        }],
        stdout: {
          display: false
        }
      })
    })
  })

  describe('Output Modes', () => {
    describe('dry-run preview', () => {
      // Use --dryrun to preview what would be generated and written without actually writing files.
      shellExample('lit-md --dryrun --outDir ./docs tmp.ts', {
        displayCommand: true,
        inputFiles: [{
          path: 'tmp.ts',
          content: `// # Preview`
        }],
        stdout: {
          display: false
        }
      })
    })

    describe('write to directory', () => {
      // Use --outDir to write generated markdown files to a specific directory. Filenames are derived from input files.
      shellExample('lit-md --outDir ./docs tmp.ts', {
        displayCommand: true,
        inputFiles: [{
          path: 'tmp.ts',
          content: `// # Documentation\nimport { example } from 'node:test'\nexample('sample', () => {})`
        }],
        outputFiles: [{
          path: './docs/tmp.md',
          contains: '# Documentation'
        }]
      })
    })
  })

  describe('Common Combinations', () => {
    describe('full validation pipeline', () => {
      // Combine --test, --typecheck, and --watch for a complete development workflow with continuous validation.
      shellExample('lit-md --test --typecheck --watch tmp.ts', {
        displayCommand: true,
        inputFiles: [{
          path: 'tmp.ts',
          content: `// # Validated\nimport { example } from 'node:test'\nimport assert from 'node:assert/strict'\nconst api: string = 'v1'\nexample('test', () => {\n  assert.equal(1 + 1, 2)\n})`
        }],
        stdout: {
          contains: '# Validated',
          display: false
        }
      })
    })

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
