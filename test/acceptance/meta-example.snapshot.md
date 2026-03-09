## Meta Example

`metaExample` documents how `example` works.
It shows the `example` call and its rendered output side by side.

```ts
example('example name', () => {
  const len = 'hello'.length
  assert.equal(len, 5)
})
```
becomes
````md
```ts
const len = 'hello'.length
len // => 5
```
````
