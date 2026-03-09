## Kept imports should merge into one code block

When using `// keep` on imports, and they're followed by example code,
they should be merged into a single code block, not separate blocks.

```ts
import { equal } from 'node:assert/strict'
import { test as example } from 'node:test'

// When running lit-md on this file, the imports with // keep
// and the example code should all appear in ONE typescript code block
equal(1 + 1, 2)
const result = 1 + 1
```
