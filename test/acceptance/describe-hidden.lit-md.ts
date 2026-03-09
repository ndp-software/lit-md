import {describe, example, setDescribeFormat} from '../../src/index.ts'
import assert from 'node:assert/strict'
setDescribeFormat('hidden')

// # Describe Hidden Format
//
// When using `--describe=hidden`, describe() block names are omitted from output (default behavior).


// ## Basic describe with examples

describe('Basic Group', () => {
  example('first test', () => {
    assert.equal(1 + 1, 2)
  })

  example('second test', () => {
    assert.equal(2 * 3, 6)
  })
})

// ## Nested describes

describe('Outer Group', () => {
  // Some description about the outer group

  describe('Inner Group', () => {
    example('nested test', () => {
      assert.equal(5 - 2, 3)
    })
  })

  describe('Another Inner Group', () => {
    example('another nested test', () => {
      assert.equal(10 / 2, 5)
    })
  })
})

// ## Deeply nested describes

describe('Level 1', () => {
  describe('Level 2', () => {
    describe('Level 3', () => {
      example('deeply nested test', () => {
        assert.equal(typeof 'test', 'string')
      })
    })
  })
})
