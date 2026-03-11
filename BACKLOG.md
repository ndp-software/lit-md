## Acceptance tests
npm run test:update should be `test:acceptance:update`, as it only applies to acceptance tests

## Bring back wait

## If timeout fails, show the feature to extend the timeout.


## PUBLISHING


- [ ] --watch mode needs some indicator of when the batch starts
- [ ] Make sure that when a command times out that it doesn't leave a process running.
- [ ] `const args = process.argv.slice(2)` Does this work with `node ../bin/lit-md` as well as `lit-md`?
- [ ] OK if tests are output when --test option is given, but this should not appear a second time while the MD is being generated.
- [ ] executeTasks seems overly complicated with non-sensicle switches on "watch" mode.
- [ ] describe blocks without examples or shell examples should still output their commented markdown
- [ ] 



## Indentation

This code in cli.lit-md.ts needs better indention:
Failed tests will prevent markdown generation.

```ts
// Input file "tmp.ts":

        import {test as example} from 'node:test'
        import assert from 'node:assert'
        // # Testing
        example('failing test', () => assert(true))
```
Two cases:
- starts inline
- starts on the following line

Algorithm: grab the whole code block. If the first line has zero indention, ignore it. Take all the lines of the code example and count their leading spaces. Use the minimum of this as the "offset", and remove that many spaces from each line of the code sample, except the first