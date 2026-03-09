// # Filename Labels
//
// Place `// file: name` before an `example()` or kept import to add a
// filename label to that code block's fence info string.

import { example } from '../../src/index.ts'
import assert from 'node:assert/strict'

// ## Label on a Short Snippet
//
// A single-expression example labeled as a TypeScript config file.

// file: config.ts
example('port config', () => {
  const port = 3000
  assert.equal(port, 3000)
})

// ## Label on a Multi-Statement Block

// file: server.ts
example('server setup', () => {
  const host = 'localhost'
  const port = 8080
  const url = `http://${host}:${port}`
  assert.equal(url, 'http://localhost:8080')
})

// ## Multiple Labels in Sequence
//
// Each `// file:` directive labels only the immediately following block.

// file: step-1.ts
example('step one', () => {
  const a = 1
  assert.equal(a, 1)
})

// file: step-2.ts
example('step two', () => {
  const b = 2
  assert.equal(b, 2)
})

// ## Label on a Kept Import

// file: my-module.ts
import { parse } from '../../src/parser.ts' // keep

example('parse call', () => {
  const nodes = parse('// hello')
  assert.equal(nodes.length, 1)
})
