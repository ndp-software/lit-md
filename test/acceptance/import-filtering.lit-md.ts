// # Import Filtering
//
// Import lines are hidden from the generated markdown by default.
// Add `// keep` at the end of an import to include it in the output.

import { example } from '../../src/index.ts'
import assert from 'node:assert/strict'

// ## Imports Hidden by Default
//
// The two imports above (`example` and `assert`) do not appear in the output.
// Only the example body is shown.

example('hidden imports', () => {
  const x = 1
  assert.equal(x, 1)
})

// ## Keeping an Import
//
// Mark a specific import with `// keep` to include it.
// This is useful when the import is part of the documentation story.

// file: usage.ts
import { parse } from '../../src/parser.ts' // keep

example('parse usage', () => {
  const nodes = parse('// hello')
  assert.equal(nodes.length, 1)
})

// ## Keeping Multiple Imports
//
// Any number of imports can be marked `// keep`.

import { render } from '../../src/renderer.ts' // keep
import type { DocNode } from '../../src/parser.ts' // keep

example('parse and render', () => {
  const src = '// # Title'
  const nodes = parse(src)
  const md = render(nodes)
  assert.equal(md, '# Title')
})
