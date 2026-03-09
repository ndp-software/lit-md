import { setDescribeFormat, describe, example } from '../../src/index.ts'
import assert from 'node:assert/strict'
setDescribeFormat('auto')

// # Describe with Auto Headers

// When using `--describe=auto`, describe() block names are rendered as headers
// that adapt to the document structure. If no headers exist yet, the first
// describe starts at h1. If headers exist, describes start one level deeper
// than the last header in the document. Nested describes go one level deeper
// than their parent.


// ## Auto with no prior headers

describe('First Group', () => {
  example('first test', () => {
    assert.equal(1 + 1, 2)
  })

  example('second test', () => {
    assert.equal(2 * 3, 6)
  })
})

// ## Auto after h1 (should start at h2)

// # First Header

describe('Second Group', () => {
  example('test after h1', () => {
    assert.equal(5 - 2, 3)
  })
})

// ## Auto after h2 (should start at h3)

// ## Second Header

describe('Third Group', () => {
  example('test after h2', () => {
    assert.equal(10 / 2, 5)
  })
})

// ## Nested describes with auto

describe('Outer Group', () => {
  describe('Inner Group', () => {
    example('nested test', () => {
      assert.equal(3 + 4, 7)
    })
  })

  describe('Another Inner Group', () => {
    example('another nested test', () => {
      assert.equal(8 - 3, 5)
    })
  })
})

// ## Deeply nested with auto

describe('Level 1', () => {
  describe('Level 2', () => {
    describe('Level 3', () => {
      example('deeply nested test', () => {
        assert.equal(typeof 'test', 'string')
      })
    })
  })
})

// ## Auto after h3 (should start at h4)

// ### Third Header

describe('Fourth Group', () => {
  example('test after h3', () => {
    assert.equal(7 * 2, 14)
  })
})
