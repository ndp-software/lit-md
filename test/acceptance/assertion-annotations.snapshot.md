## Assertion Annotations

Assertions inside `example()` bodies are rewritten as inline annotations,
turning passing tests into self-documenting code examples.

### Equality → `// => value`

```ts
example('equal examples', () => {
  const len = 'hello'.length
  assert.equal(len, 5)

  const count = [1, 2, 3].length
  assert.strictEqual(count, 3)

  const nums = [1, 2, 3]
  assert.deepEqual(nums, [1, 2, 3])

  const point = { x: 1, y: 2 }
  assert.deepEqual(point, {
    x: 1,
    y: 2
  })

  const value = getValue()
  assert.notEqual(value, null)
})
```
becomes
````md
```ts
const len = 'hello'.length
len // => 5

const count = [1, 2, 3].length
count // => 3

const nums = [1, 2, 3]
nums // => [1, 2, 3]

const point = { x: 1, y: 2 }
point // => {
      //   x: 1,
      //   y: 2
      // }

const value = getValue()
value // != null
```
````

### Throws — With Pattern

```ts
example('throws with pattern', () => {
  assert.throws(() => divide(1, 0), /division by zero/)
})
```
becomes
````md
```ts
divide(1, 0) // throws /division by zero/
```
````

### Throws — No Pattern

```ts
example('throws no pattern', () => {
  assert.throws(() => divide(1, 0))
})
```
becomes
````md
```ts
divide(1, 0) // throws
```
````

### assert.ok — Dropped at Statement Level

`assert.ok(expr)` as a standalone statement is silently removed from output.
It still runs and guards correctness, but doesn't clutter the docs.

```ts
example('ok dropped', () => {
  const items = [1, 2, 3]
  assert.ok(items.length > 0)
})
```
becomes
````md
```ts
const items = [1, 2, 3]
```
````

### Multiple Assertions

Each assertion in a body is independently annotated inline.

```ts
example('multiple', () => {
  const s = 'hello'
  assert.equal(s.length, 5)
  assert.equal(s.toUpperCase(), 'HELLO')
  assert.equal(s[0], 'h')
})
```
becomes
````md
```ts
const s = 'hello'
s.length // => 5
s.toUpperCase() // => 'HELLO'
s[0] // => 'h'
```
````
