import {describe} from '../../src/index.ts'
import {example, metaExample} from '../../src/shell.ts'
import assert from 'node:assert/strict'

describe('Async examples', () => {
  metaExample('Async example', async () => {
    await new Promise(resolve => setTimeout(resolve, 100))
    assert.ok(true)
  })

  metaExample('Async results', async () => {
    const result = await new Promise(resolve => setTimeout(() => resolve(42), 100))
    assert.equal( result, 42)
  })

})