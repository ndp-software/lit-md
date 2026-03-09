import { describe, example } from '../../src/index.ts'
import assert from 'node:assert/strict'

describe('Erased Constructs', () => {
  // Some TypeScript constructs are silently erased from the generated output.
  // They run (and assert correctness), but don't clutter the docs.

  describe('describe() Wrappers', () => {
    // describe() names are discarded — only the examples and comments inside appear.
    // The word "Math" never appears in the output.

    describe('Math', () => {
      example('add', () => {
        const sum = 1 + 1
        assert.equal(sum, 2)
      })
    })
  })

  describe('Prose Inside describe()', () => {
    // Comments between examples inside `describe()` become interleaved prose blocks.

    describe('string utilities', () => {
      // Convert a string to upper case:

      example('toUpperCase', () => {
        const result = 'hello'.toUpperCase()
        assert.equal(result, 'HELLO')
      })

      // And back to lower:

      example('toLowerCase', () => {
        const result = 'WORLD'.toLowerCase()
        assert.equal(result, 'world')
      })
    })
  })

  describe('Nested describe()', () => {
    // Deeply nested `describe()` wrappers are also transparent.

    describe('outer', () => {
      describe('inner', () => {
        example('deep', () => {
          const x = 6 * 7
          assert.equal(x, 42)
        })
      })
    })
  })

  describe('Top-Level Helper Functions', () => {
    // Functions (and variables) defined at the top level are invisible — they
    // exist to support examples but don't appear in the output.

    example('helpers', () => {
      const result = double(21)
      assert.equal(result, 42)
    })
  })
})

function double(n: number) { return n * 2 }
