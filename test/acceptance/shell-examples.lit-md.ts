// # Shell Commands: `shellExample`
//
// lit-md provides the `shellExample` function to embed executable shell commands in documentation.
// It runs the command as a test and emits a `sh` code block.

import { shellExample } from '../../src/index.ts'

// ## Basic Commands

// By default, the command is shown in the output as a `$ command` line.
shellExample('echo "hello world"', {
  meta: true
})

// Set `stdout: { display: true }` to capture and show the actual
// output without an assertion.
shellExample('echo "hello stdout"', {
  meta: true,
  stdout: { display: true }
})

// Set `displayCommand: false` to suppress the `$ command` line entirely.
// The command still runs — only the documentation is affected.
// Combine with `stdout: { display: true }` to show just the output.
shellExample('echo "quiet output"', {
  meta: true,
  displayCommand: false,
  stdout: { display: true }
})

// ## inputFiles
shellExample('cat input.txt', {
  meta: true,
  inputFiles: [{ path: 'input.txt', content: 'hello world' }]
})

// By default, each input file is introduced with a label with the file name.
// Set `displayPath: false` to not mention a file name.
shellExample('cat input.txt', {
  meta: true,
  inputFiles: [{ path: 'input.txt', content: 'hello world', displayPath: false }]
})

// Set `display: false` to suppress the file content entirely.
shellExample('cat input.txt', {
  meta: true,
  inputFiles: [{ path: 'input.txt', content: 'hello world', display: false }]
})

// ## outputFiles

// By default, output files are captioned with the filename and assertion text.
// Set `displayPath: false` to show the content under a generic `Output:` label.
shellExample('echo "result" > out.txt', {
  meta: true,
  outputFiles: [{ path: 'out.txt' }]
})

// Set `displayPath: false` to show the content under a generic `Output:` label.
shellExample('echo "result" > out.txt', {
  meta: true,
  outputFiles: [{ path: 'out.txt', displayPath: false }]
})

// Set `summary: false` to suppress the prose caption entirely —
// the file content is shown with no introductory line.
shellExample('echo "42" > answer.txt', {
  meta: true,
  outputFiles: [{ path: 'answer.txt', contains: '42', summary: false }]
})


// ### Asserting stdout
//
// Use `stdout: { contains: '...' }` to assert that stdout contains a substring.

shellExample('echo "ready"', {
  stdout: { contains: 'ready' }
})

// ### Asserting file output
//
// Use `outputFiles` to assert that a file created by the command contains expected content.

shellExample('echo "hello" > greeting.txt', {
  outputFiles: [
    { path: 'greeting.txt', contains: 'hello' }
  ]
})

// ## Multiple Commands
//
// Join multiple commands with `&&` to run them in sequence and emit a single `sh` block.

shellExample('echo "first" && echo "second"')



// ## With stdout Assertion
//
// Using `shellExample('node --version', { stdout: { contains: '24.11.1' }})` produces:
shellExample('node --version', {stdout: { contains: '24.11.1' }})

// ## With Input and Output Files
//
// `inputFiles` (optionally) creates a file of a given name with specific content
// `outputFiles` verifies that specified files exist after the command runs
// and contain expected content.
shellExample('cp input.txt output.txt', {
  inputFiles: [{
    path: 'input.txt',
    content: 'hello world'
  }],
  outputFiles: [
    {path: 'output.txt', contains: 'hello world'}
  ]
})

// File contents can assert that they match a regex pattern:
shellExample('cp input.txt output.txt', {
  inputFiles: [{
    path: 'input.txt',
    content: 'first line\nsecond line'
  }],
  outputFiles: [
    {path: 'output.txt', matches: /^first/}
  ]
})

// Larger files will display nicely in the emitted markdown, and regex assertions can verify just the relevant part:
shellExample('sort input.txt >output.txt', {
  inputFiles: [{
    path: 'input.txt',
    content: 'first line\nsecond line\nthird line\nfourth line'
  }],
  outputFiles: [
    {path: 'output.txt', matches: /^first/}
  ]
})

// ## Output Files Without Assertions
//
// You can also display output file contents without any `contains` or `matches` assertion:
shellExample('echo "Hello, World!" > greeting.txt', {
  outputFiles: [
    {path: 'greeting.txt'}
  ]
})

// Output files can display with only a `matches` assertion:
shellExample('echo "version 1.2.3" > version.txt', {
  outputFiles: [
    {path: 'version.txt', matches: /version \d+\.\d+\.\d+/}
  ]
})

// You can also display stdout without any assertions:
shellExample('echo "Hello, World!"', {
  stdout: {}
})

// Stdout can also use regex patterns with `matches`:
shellExample('echo "version 2.5.1"', {
  stdout: { matches: /version \d+\.\d+\.\d+/ }
})

// Stdout can use `contains` with regex patterns:
shellExample('echo "Error: file not found"', {
  stdout: { contains: /Error:/ }
})

// File assertions can use `contains` with regex patterns:
shellExample('echo "config.json" > filename.txt', {
  outputFiles: [
    {path: 'filename.txt', contains: /\.json/}
  ]
})

// File assertions can use `matches` with strings:
shellExample('echo "success code 0" > result.txt', {
  outputFiles: [
    {path: 'result.txt', matches: 'success'}
  ]
})

// Sometimes file names are not important
shellExample('sort input.txt >output.txt', {
  displayCommand: false,
  inputFiles: [{
    path: 'input.txt',
    displayPath: true,
    content: 'first line\nsecond line\nthird line\nfourth line'
  }],
  outputFiles: [
    {
      path: 'output.txt',
      displayPath: true,
      matches: /^first/
    }
  ]
})

// ## With meta Option
//
// Using `shellExample` with `meta: true` outputs the call itself before the command:
shellExample('echo "meta test"', {
  meta: true,
  stdout: {}
})

// With other options and meta:
shellExample('echo "version 1.2.3" > version.txt', {
  outputFiles: [
    {path: 'version.txt', matches: /version \d+\.\d+\.\d+/}
  ],
  meta: true
})
