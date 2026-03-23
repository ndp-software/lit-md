Tests can be defined as `example`
```ts
1 + 1 // => 2
```

Tests can be written as `spec` (BDD-style alias for test)
```ts
1 + 1 // => 2
```

Tests can be written as `test`
(using the test function through example import pattern would be unusual,
but it's imported below for proper Node.js test execution)
```ts
1 + 1 // => 2
```

Tests can be written as `it` (BDD-style alias for test/spec)
```ts
2 + 2 // => 4
```

Tests can be grouped with `context` (alias for describe)

## context grouping

### nested context

```ts
3 + 3 // => 6
```

Tests can be grouped with `suite` (another alias for describe)

## suite grouping

### nested suite

```ts
4 + 4 // => 8
```
