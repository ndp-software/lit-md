## Async examples

```ts
example('Async example', async () => {
  await new Promise(resolve => setTimeout(resolve, 100))
  assert.ok(true)
})
```
becomes
````md
```ts
await new Promise(resolve => setTimeout(resolve, 100))
```
````

```ts
example('Async results', async () => {
  const result = await new Promise(resolve => setTimeout(() => resolve(42), 100))
  assert.equal( result, 42)
})
```
becomes
````md
```ts
const result = await new Promise(resolve => setTimeout(() => resolve(42), 100))
result // => 42
```
````
