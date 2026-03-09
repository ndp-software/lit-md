import { example, describe } from '../../src/index.ts'
import assert from 'node:assert/strict'
import { parse } from '../../src/parser.ts'
import { render } from '../../src/renderer.ts'

describe('Code Fence Merging', () => {
  // When a comment block ends with a closing code fence (` ``` `), the body of
  // the following `example()` is merged into that fence as one code block.
  // This lets you show an import alongside its live-tested usage.

  describe('Basic Merge', () => {
    // Show an import in the comment fence; the example body continues it.
    //
    // ```ts
    // import { parse } from '@ndp-software/lit-md'
    // ```

    example('parse usage', () => {
      const nodes = parse('// hello')
      assert.equal(nodes.length, 1)
    })
  })

  describe('Import + Assertion in One Block', () => {
    // The merge produces a single cohesive block: import, usage, and annotation.
    //
    // ```ts
    // import { render } from '@ndp-software/lit-md'
    // ```

    example('render usage', () => {
      const md = render([{ kind: 'prose', text: '# Hello' }])
      assert.equal(md, '# Hello')
    })
  })

  describe('No Merge Without Trailing Fence', () => {
    // A comment that does NOT end with a fence produces separate prose and code blocks.

    example('separate block', () => {
      const x = 1 + 1
      assert.equal(x, 2)
    })
  })
})
