## Code Blocks

The body of each `example()` call becomes a fenced TypeScript code block.
The test name becomes the label in the fence info string.

### Single Statement

A one-liner body produces a single-line code block.
```ts
const greeting = 'Hello, world!'
greeting.length // => 13
```

### Multiple Statements

All statements are included with one level of indentation stripped.
```ts
const a = 10
const b = 20
const sum = a + b
sum // => 30
```

### describe() Groups Examples

`describe()` is transparent — examples inside it still emit code blocks.
See also: `describe-transparency`.

#### string utilities

```ts
const raw = '  hello  '
raw.trim() // => 'hello'

const parts = 'a,b,c'.split(',')
parts.length // => 3
```

### Empty Body Produces No Block

An `example()` with an empty body emits nothing.

### Code blocks within comments
