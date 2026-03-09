import { example, metaExample, describe } from '../../src/index.ts'
import assert from 'node:assert/strict'

describe('Assertion Annotations', () => {
  // Assertions inside `example()` bodies are rewritten as inline annotations,
  // turning passing tests into self-documenting code examples.

  describe('Equality → `// => value`', () => {
    metaExample('equal examples', () => {
      const len = 'hello'.length
      assert.equal(len, 5)

      const count = [1, 2, 3].length
      assert.strictEqual(count, 3)

      const nums = [1, 2, 3]
      assert.deepEqual(nums, [1, 2, 3])

      const point = { x: 1, y: 2 }
      assert.deepEqual(point, {
        x: 1,
        y: 2
      })

      const value = getValue()
      assert.notEqual(value, null)
    })
  })

  describe('Throws — With Pattern', () => {
    metaExample('throws with pattern', () => {
      assert.throws(() => divide(1, 0), /division by zero/)
    })
  })

  describe('Throws — No Pattern', () => {
    metaExample('throws no pattern', () => {
      assert.throws(() => divide(1, 0))
    })
  })

  describe('assert.ok — Dropped at Statement Level', () => {
    // `assert.ok(expr)` as a standalone statement is silently removed from output.
    // It still runs and guards correctness, but doesn't clutter the docs.

    metaExample('ok dropped', () => {
      const items = [1, 2, 3]
      assert.ok(items.length > 0)
    })
  })

  describe('Multiple Assertions', () => {
    // Each assertion in a body is independently annotated inline.

    metaExample('multiple', () => {
      const s = 'hello'
      assert.equal(s.length, 5)
      assert.equal(s.toUpperCase(), 'HELLO')
      assert.equal(s[0], 'h')
    })
  })
})

function getValue() { return 42 }
function divide(a: number, b: number) {
  if (b === 0) throw new Error('division by zero')
  return a / b
}
