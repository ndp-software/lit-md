import { describe, example } from '../../src/index.ts'
import assert from 'node:assert/strict'

describe('Code Blocks', () => {
  // The body of each `example()` call becomes a fenced TypeScript code block.
  // The test name becomes the label in the fence info string.

  describe('Single Statement', () => {
    // A one-liner body produces a single-line code block.

    example('single statement', () => {
      const greeting = 'Hello, world!'
      assert.equal(greeting.length, 13)
    })
  })

  describe('Multiple Statements', () => {
    // All statements are included with one level of indentation stripped.

    example('multiple statements', () => {
      const a = 10
      const b = 20
      const sum = a + b
      assert.equal(sum, 30)
    })
  })

  describe('describe() Groups Examples', () => {
    // `describe()` is transparent — examples inside it still emit code blocks.
    // See also: `describe-transparency`.

    describe('string utilities', () => {
      example('trim', () => {
        const raw = '  hello  '
        assert.equal(raw.trim(), 'hello')
      })

      example('split', () => {
        const parts = 'a,b,c'.split(',')
        assert.equal(parts.length, 3)
      })
    })
  })

  describe('Empty Body Produces No Block', () => {
    // An `example()` with an empty body emits nothing.

    example('empty body', () => {})
  })

  describe('Code blocks within comments', () => {
    // Code blocks inside comments are included in the output as-is, without needing an `example()`.
    // They are not run as part of the tests.
    // ```typescript
    // const x = 42
    // console.log(x, x / 7, 'Hello', "world")
    // ```
  })
})
