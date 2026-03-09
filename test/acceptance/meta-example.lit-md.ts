import { metaExample, describe } from '../../src/index.ts'
import assert from 'node:assert/strict'

describe('Meta Example', () => {
  // `metaExample` documents how `example` works.
  // It shows the `example` call and its rendered output side by side.

  metaExample('example name', () => {
    const len = 'hello'.length
    assert.equal(len, 5)
  })
})
