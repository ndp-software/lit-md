
import assert from 'node:assert/strict'
import {example, spec, it, context, suite} from '../../src/shell.ts'

// Tests can be defined as `example`
example('example works', () => {
  assert.equal(1 + 1, 2)
})

// Tests can be written as `spec` (BDD-style alias for test)
spec('spec works', () => {
  assert.equal(1 + 1, 2)
})

// Tests can be written as `test`
// (using the test function through example import pattern would be unusual,
// but it's imported below for proper Node.js test execution)
import {test} from 'node:test'
test('test works', () => {
  assert.equal(1 + 1, 2)
})

// Tests can be written as `it` (BDD-style alias for test/spec)
it('it works', () => {
  assert.equal(2 + 2, 4)
})

// Tests can be grouped with `context` (alias for describe)
context('context grouping', () => {
  context('nested context', () => {
    spec('spec inside context', () => {
      assert.equal(3 + 3, 6)
    })
  })
})

// Tests can be grouped with `suite` (another alias for describe)
suite('suite grouping', () => {
  suite('nested suite', () => {
    it('it inside suite', () => {
      assert.equal(4 + 4, 8)
    })
  })
})