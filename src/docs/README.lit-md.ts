import {
  describe,
  shellExample,
  alias,
  stripTypesFlag,
} from '../index.ts'
import assert from 'node:assert/strict'

const _flag = stripTypesFlag()
alias('lit-md', ['node', _flag, './src/cli.ts'].filter(Boolean).join(' '))

/*
# @ndp-software/lit-md

Literate test files that generate `README.md`s.

## Introduction

Some projects, especially libraries, require numerous code examples. For those responsible for updating
a README, or other documentation, this can be burdensome and error-prone. I've run into this before when writing a testing tool, and ran into it again when sketching out a new UI library. I wanted to write documentation with embedded code examples, but I also wanted to be sure that the examples were correct and up-to-date. This is what led me to create **lit-md**.

With **lit-md**, you write your documentation with embedded code samples.
All the code samples are automatically type-checked and run through node to
verify them (as tests). Every example actually works!

Key features:
- works with Typescript or Javascript
- supports flexible assertion methods
- provides utilities to include shell commands and their outputs
  as part of your documentation. This is important if you tool has
  a CLI, or you just need to show how it works in the terminal.
- fully tested with its own test suite, which also serves as
  documentation and examples for users

There _are_ other tools with the same aims (see [#similar-tools]),
But this combines my interest in Literate programming with a passion for TDD and excitement about Typescript. I have aimed to provide a great DX
for writing documentation, with a simple syntax and powerful features
that work well with-in the node ecosystem.

Documention is written in .ts (or .lit-md.ts) files, and the documentation is generated from comments and test bodies:
```sh
lit-md README.lit-md.ts > README.md

# As a convenience, "run" all the code examples as tests, or a test suite:
node --test README.lit-md.ts > README.md

# Or, you can add typechecking and do them all as one step:
lit-md --typecheck --test README.lit-md.ts > README.md
```
## How it Works
A **lit-md** file contains prose in comments and examples in test bodies.
At a basic level, a file is processed, and
- comments are directly transferred into markdown, and
- example (or `test`, `it`, `spec`) bodies become fenced code blocks.
To make this work well, there are quite a few nuances and features to control
what appears in the output and how it looks.

## Basic Usage

Add `@ndp-software/lit-md` to your project

Then create a readme. The following is an example for a hypohetical "mathlib" project. Here's the source file:
*/
shellExample(`lit-md mathlib-readme.ts`, {
  inputFiles: [{
    path: 'maths.ts',
    displayPath: false,
    display: false,
    content: `
    export function add(a: number, b: number): number {
    return a + b
    }
    
export function multiply(x: number, y: number): number {
return x * y
}
`
  },{
    path: 'mathlib-readme.ts',
    displayPath: false,
    display: true,
    content: `import { describe, example } from '@ndp-software/lit-md'
import assert from 'node:assert/strict'

import { add, multiply } from './maths.ts'

describe('My Project README.', () => {
  /*
  This is a really great project! 
  Adding numbers is as simple as using the "+" operator:
  */
  example('add example', () => {
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
`
  }],
  displayCommand: true,
  stdout: {
    display: true,
    contains: 'This is a really great project!'
  }
})

/*
The full node assert library is supported.

For more information on CLI usage, see [CLI documentation](./docs/cli.md).
*/

describe('Shell examples', () => {
  /*
  Use `shellExample` to include executable shell commands in the README.
  It verifies a 0 return code and provides flexible assertion and display options.
  */

  describe('shellExample function', () => {
    shellExample('echo "hello world"', { meta: true, stdout: { display: true } })
  })

  /*
  For more information on the `shellExample`, see [shellCommand documentation](./docs/shell-examples.md).
  */
})

/*

## Similar tools
- [Literate JS](https://github.com/danvk/literate-ts) -- types checks code blocks in markdown files
- [TwoSlash](https://github.com/microsoft/TypeScript-Website/tree/v2/packages/ts-twoslasher)
- In [Test Pantry](https://github.com/ndp-software/test-pantry), I wrote [a function that extracts code blocks out of a markdown file and produces a test (.js) file](https://github.com/ndp-software/test-pantry/blob/master/readme-test-filter.js). This is similar to the approach of Literate JS (above), but is JS-only. This approach has limitations that the full parsing of lit-md overcomes.

## Credits

Conceived of and built by Andrew J. Peterson, NDP Software

Literate Programming has been a long-standing interest of mine. An earlier
version of trying to solve this problem is in Test Pantry, but this is a complete re-thinking and re-implementation, with a much more robust and flexible approach. I have been inspired by many literate programming tools, but especially Knuth's original work.

Although there was some manual code changes,
most of the code was Github Copilot CLI, using mostly Claude Haiku 4.5
and some Claude Sonnet 4.6.
Most tasks used a plan-autopilot loop, but other approaches were used as well.
 */

