## Basic Prose

In lit-md, comments become the prose sections of your markdown.
Both `//` line comments and `/* */` block comments are supported.

### Line Comments

Consecutive `//` lines merge into one paragraph.
Leave a blank `//` to start a new paragraph.

This sentence is a second paragraph.
```ts
const msg = 'line comments become markdown'
typeof msg // => 'string'
```

### Block Comments

Block comments also work.
Leading `*` characters and indentation are stripped.
```ts
const msg = 'block comments also become prose'
typeof msg // => 'string'
```

### Markdown Formatting
