import {
  describe,
  example,
  shellExample,
  metaExample,
  alias,
  stripTypesFlag,
  setDescribeFormat
} from '../index.ts'
import assert from 'node:assert/strict'

const _flag = stripTypesFlag()
alias('lit-md', ['node', _flag, './src/cli.ts'].filter(Boolean).join(' '))

/*
# @ndp-software/lit-md

Literate test files that generate `README.md`s.

## Introduction

Some projects, especially libraries, require numerous and
detailed code examples. For those responsible for updating
a README, or other documentation, this can be burdensome
and error-prone.

With lit-md, you write your documentation with embedded code samples
that are automatically type-checked and run through node to
verify them. Every example actually works!

Key features:
- works with Typescript or Javascript
- provides utilities to include shell commands and their outputs
  as part of your documentation. This is important if you tool has
  a CLI, or you just need to show how it works in the terminal.
- supports flexible assertion methods for both code examples and shell commands,
  with options to display actual outputs in the generated markdown
- fully tested with its own test suite, which also serves as
  documentation and examples for users

There _are_ other tools with the same aims (e.g. [TwoSlash](https://github.com/microsoft/TypeScript-Website/tree/v2/packages/ts-twoslasher)),
but this follows in the Literate programming tradition but updated
for the Typescript and TDD era. I have aimed to provide a great DX
for writing documentation, with a simple syntax and powerful features
that work well with the node ecosystem.

```sh
# You can "run" your documentation as a test:
node --test README.lit-md.ts
# You can also typecheck:
tsc README.lit-md.ts
# An it can be converted from Typescript to a plain old markdown
# README file with `lit-md`:
lit-md README.lit-md.ts        # generates README.md

# Or, you can do it all in one step with:
lit-md --test --typecheck README.lit-md.ts  # all-in-one!
```
## How it Works
A **lit-md** file contains prose in comments and examples in test bodies.
At a basic level, a file is processed and
- comments are directly transferred into markdown, and
- example (or `test`, `it`, `spec`) bodies become fenced code blocks.
To make this work well, there are quite a few nuances and features to control
what appears in the output and how it looks.

# A simple example
*/
shellExample(`lit-md my-readme.ts`, {
  inputFiles: [{
    path: 'my-readme.ts',
    displayPath: false,
    display: true,
    content: `
describe('My Project README.', () => {
/*
This is a really great project! 
Adding numbers is as simple as using the "+" operator:
*/
example('add example', () => {
  const a = 1
  const b = 2
  console.log(a + b) // => 3
})  

// Also supported is multiplication:
example('multiply example', () => {
  const x = 3
  const y = 4
  console.log(x * y) // => 12
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
For more information on the CLI, see [CLI documentation](./docs/cli.md).
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
## CREDITS

Built by Andrew J. Peterson, although there was some manual code changes,
most of the code was Github Copilot CLI, using mostly Claude Haiku 4.5
and some Claude Sonnet 4.6.
Most tasks used a plan-autopilot loop, but other approaches were used as well.
 */

