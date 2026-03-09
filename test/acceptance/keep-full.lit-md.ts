import {example, metaExample, describe, shellExample, stripTypesFlag, alias} from '../../src/index.ts'
import assert from 'node:assert/strict'
const _flag = stripTypesFlag()
alias('lit-md', ['node', _flag, './src/cli.ts'].filter(Boolean).join(' '))

// # Keeping Full Statements

// The `// keep` directive includes statements in the output.
// For multi-line statements like functions and classes, use `// keep:full` to include the entire body.

// ## Single-Line Keep

describe('Single-Line Keep', () => {
  shellExample('lit-md input.md',
    {
      stdout: {
        display: true,
        contains: 'timeout: 5000'
      },
      inputFiles: [{
        path: 'input.md',
        content: `
  const CONFIG = {timeout: 5000} // keep

  example('use config', () => {
    const delay = CONFIG.timeout
    assert.equal(delay, 5000)
  })
`
      }]
    })
})

// ## Single-Line Keep old

describe('Single-Line Keep old', () => {
  // Single-line statements use `// keep`: const CONFIG = { timeout: 5000 } // keep
  const CONFIG = {timeout: 5000}

  example('use config', () => {
    const delay = CONFIG.timeout
    assert.equal(delay, 5000)
  })
})

// ## Multi-Line Keep with // keep:full

describe('Multi-Line Keep with // keep:full', () => {
  // For functions and classes, use `// keep:full` to preserve the entire definition.
  function createCounter() {
    let count = 0
    return {
      increment() { count++ },
      get: () => count
    }
  }

  example('counter example', () => {
    const counter = createCounter()
    counter.increment()
    assert.equal(counter.get(), 1)
  })
})

// ## Classes with // keep:full

describe('Classes with // keep:full', () => {
  // Classes can use `// keep:full` to show their full definition.
  class Logger {
    private messages: string[] = []

    log(msg: string) {
      this.messages.push(msg)
    }

    getMessages() {
      return this.messages
    }
  }

  metaExample('logger example', () => {
    const logger = new Logger()
    logger.log('hello')
    const msgs = logger.getMessages()
    assert.equal(msgs.length, 1)
    assert.equal(msgs[0], 'hello')
  })
})
