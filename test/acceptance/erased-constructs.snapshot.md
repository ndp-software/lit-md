## Erased Constructs

Some TypeScript constructs are silently erased from the generated output.
They run (and assert correctness), but don't clutter the docs.

### describe() Wrappers

describe() names are discarded — only the examples and comments inside appear.
The word "Math" never appears in the output.

#### Math

```ts
const sum = 1 + 1
sum // => 2
```

### Prose Inside describe()

Comments between examples inside `describe()` become interleaved prose blocks.

#### string utilities

Convert a string to upper case:
```ts
const result = 'hello'.toUpperCase()
result // => 'HELLO'
```

And back to lower:
```ts
const result = 'WORLD'.toLowerCase()
result // => 'world'
```

### Nested describe()

Deeply nested `describe()` wrappers are also transparent.

#### outer

##### inner

```ts
const x = 6 * 7
x // => 42
```

### Top-Level Helper Functions

Functions (and variables) defined at the top level are invisible — they
exist to support examples but don't appear in the output.
```ts
const result = double(21)
result // => 42
```
