# Describe with H2 Headers

When using `--describe=##`, describe() block names are rendered as H2 headers.
Nested describes become deeper header levels.
## Basic describe with examples

## Basic Group

```ts
1 + 1 // => 2

2 * 3 // => 6
```

## Nested describes

## Outer Group

Some description about the outer group

### Inner Group

```ts
5 - 2 // => 3
```

### Another Inner Group

```ts
10 / 2 // => 5
```

## Deeply nested describes

## Level 1

### Level 2

#### Level 3

```ts
typeof 'test' // => 'string'
```
