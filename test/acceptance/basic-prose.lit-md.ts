import { example, describe } from '../../src/index.ts'
import assert from 'node:assert/strict'

describe('Basic Prose', () => {
  // In lit-md, comments become the prose sections of your markdown.
  // Both `//` line comments and `/* */` block comments are supported.

  describe('Line Comments', () => {
    // Consecutive `//` lines merge into one paragraph.
    // Leave a blank `//` to start a new paragraph.
    //
    // This sentence is a second paragraph.

    example('line comment demo', () => {
      const msg = 'line comments become markdown'
      assert.equal(typeof msg, 'string')
    })
  })

  describe('Block Comments', () => {
    /*
     * Block comments also work.
     * Leading `*` characters and indentation are stripped.
     */

    example('block comment demo', () => {
      const msg = 'block comments also become prose'
      assert.equal(typeof msg, 'string')
    })
  })

  describe('Markdown Formatting', () => {
    // Comments support full Markdown: **bold**, `inline code`, and lists.
    //
    // - `parse()` — extracts structure
    // - `render()` — emits markdown
    // - `example()` — creates code blocks
  })
})
