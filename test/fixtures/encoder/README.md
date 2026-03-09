# Encoder

A TypeScript utility for base64 encoding strings.

```ts
import { encode, decode } from './encoder.ts'
```

## Basic Usage

Pass any string to `encode` and get a base64 result:
```ts encode-example.ts
import { encode } from './encoder.ts'
const result = encode('hello')
result // => 'aGVsbG8='
```

You can also encode empty strings:
```ts
encode('') // => ''
```

## Round-trip

`decode` reverses `encode`:



```ts
decode(encode('world')) // => 'world'
```

## Illustrative

Chaining is possible but unusual:

```ts
const twice = encode(encode('hello'))
```
