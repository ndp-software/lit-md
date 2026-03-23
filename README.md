# @ndp-software/lit-md

Literate test files that generate `README` or any other markdown documents with working code samples.

## Introduction

Some projects, especially libraries, require code examples. For those (like me) responsible for updating
the docs, this can be burdensome and error-prone. I ran into this when writing a testing tool, and I just confronted it again when sketching out a new UI library. I wanted to write _documentation with embedded code examples_, and guarantee that the examples were _correct and up to date_. This need led me to create **lit-md**.

*lit-md** is simple: you write your documentation as a block comment in a TypeScript file. For an code example blocks, you exit the comment and embed an `example`, which looks just like a test. (And is!)
Because this is a TypeScript file, you get nice editor support for you code samples, and all the code samples are automatically type-checked and run as tests to assert specific behaviors. Every example actually works!

Key features:
- works with TypeScript or JavaScript
- supports flexible assertion methods
- niceties like bundled test running and type checking, "watch" mode, document structuring with "describe" blocks
- shell command code samples, their inputs and outputs, can be inserted in documentation and validated

There _are_ other tools with the same aims (see [Similar Tools](#similar-tools) below),
but **lit-md** is a unique combination of [Literate programming](https://en.wikipedia.org/wiki/Literate_programming), TDD and TypeScript. I have aimed to provide a great DX
for writing documentation, with a simple syntax and powerful features
that work well within the node ecosystem.

## How it Works

Documention is written in .ts (or .lit-md.ts) files. These **lit-md** file contains prose in comments and examples in test bodies. At a basic level, a file is processed, and
- comments are directly transferred into markdown, and
- example (or `test`, `spec`, `it`) bodies become fenced code blocks.
To make this work well, there are quite a few nuances and features to control
what appears in the output and how it looks. You can also group examples with `describe` (or `context`, `suite`).

Once you have a file, you use the cli to generate the raw markdown file:
```sh
lit-md README.lit-md.ts --out README.md
```
You can also run this file as a test file (`node --test README.lit-md.ts`). As a convenience, **lit-md** will do this for you with the `--test` flag:
```sh
node --test README.lit-md.ts --out README.md
```
You can also make use the typechecking of TypeScript using the `tsc` command. This is optionally provided for you with the `--typecheck` command:
```sh
lit-md --typecheck --test README.lit-md.ts --out README.md
```

## Basic Usage

Add `@ndp-software/lit-md` to your project

Then create a readme source file. The following is an example for a hypohetical "mathlib" project. Here's the source file:

```ts
import { describe, example } from '@ndp-software/lit-md'
import assert from 'node:assert/strict'

describe('My Project README.', () => {
// This is a really great project!
// Adding numbers is as simple as using the "+" operator:
  example('add example', () => {
    import { add, multiply } from './maths.ts'
    const a = 1
    const b = 2
    assert.equal(add(a, b), 3)
  })

  // Also supported is multiplication:
  example('multiply example', () => {
    const x = 3
    const y = 4
    assert.equal(multiply(x, y), 12)
  })
})

```

```sh
$ lit-md mathlib-readme.ts --out mathlib-readme.md
```

Output file `mathlib-readme.md`:
````markdown
## My Project README.

This is a really great project! 
Adding numbers is as simple as using the "+" operator:
```ts
import { add, multiply } from './maths.ts'
const a = 1
const b = 2
add(a, b) // => 3
```

Also supported is multiplication:
```ts
const x = 3
const y = 4
multiply(x, y) // => 12
```
````

As you can see, `assert.equal` was mapped to and appropriate raw TypeScript so that it looks like an actual code example. The full node assert library is supported.

For more information on CLI usage, see [CLI documentation](./docs/cli.md).

## Shell examples

Use `shellExample` to include executable shell commands in the README.
  It verifies a 0 return code and provides flexible assertion and display options.

### shellExample function

```ts
shellExample('echo "hello world"', { stdout: {display: true}})
```
becomes
```sh
$ echo "hello world"
hello world
```

For more information on the `shellExample`, see [shellCommand documentation](./docs/shell-examples.md).
## Development

See [DEVELOPMENT.md](DEVELOPMENT.md) file.


## Similar tools
- [Literate JS](https://github.com/danvk/literate-ts) -- types checks code blocks in markdown files
- [TwoSlash](https://github.com/microsoft/TypeScript-Website/tree/v2/packages/ts-twoslasher)
- In [Test Pantry](https://github.com/ndp-software/test-pantry), I wrote [a function that extracts code blocks out of a markdown file and produces a test (.js) file](https://github.com/ndp-software/test-pantry/blob/master/readme-test-filter.js). This also makes an apperance in my abandoned [literate-es-webpack-loader](https://github.com/ndp-software/literate-es-webpack-loader). This is similar to the approach of Literate JS (above), but is JS-only. This approach has limitations that the full parsing of lit-md overcomes.
- [Literate Coffeescript](https://coffeescript.org/#literate)
- [Erudite](https://github.com/artisonian/erudite)

## Credits

Conceived of and built by Andrew J. Peterson, NDP Software

Literate Programming has been a long-standing interest of mine. An earlier
version of trying to solve this problem is in Test Pantry, but this is a complete re-thinking and re-implementation, with a much more robust and flexible approach. I have been inspired by many literate programming tools, but especially Knuth's original work.

Although there was some manual code changes,
most of the code was used to learn AI-assisted programming, with Github Copilot CLI (Claude Haiku 4.5
and some Claude Sonnet 4.6). Most tasks used a plan-autopilot loop, but I explored other approaches.
