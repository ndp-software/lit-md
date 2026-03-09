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
