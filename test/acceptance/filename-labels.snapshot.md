# Filename Labels

Place `// file: name` before an `example()` or kept import to add a
filename label to that code block's fence info string.
## Label on a Short Snippet

A single-expression example labeled as a TypeScript config file.
```ts config.ts
const port = 3000
port // => 3000
```

## Label on a Multi-Statement Block
```ts server.ts
const host = 'localhost'
const port = 8080
const url = `http://${host}:${port}`
url // => 'http://localhost:8080'
```

## Multiple Labels in Sequence

Each `// file:` directive labels only the immediately following block.
```ts step-1.ts
const a = 1
a // => 1
```

```ts step-2.ts
const b = 2
b // => 2
```

## Label on a Kept Import

```ts my-module.ts
import { parse } from '../../src/parser.ts'
```

```ts
const nodes = parse('// hello')
nodes.length // => 1
```
