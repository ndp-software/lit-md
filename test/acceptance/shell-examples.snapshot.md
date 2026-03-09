# Shell Commands: `shellExample`

lit-md provides the `shellExample` function to embed executable shell commands in documentation.
It runs the command as a test and emits a `sh` code block.
## Basic Commands

By default, the command is shown in the output as a `$ command` line.

```ts
shellExample('echo "hello world"')
```
becomes
```sh
$ echo "hello world"
```

Set `stdout: { display: true }` to capture and show the actual
output without an assertion.

```ts
shellExample('echo "hello stdout"', {
  stdout: { display: true }
})
```
becomes
```sh
$ echo "hello stdout"
hello stdout
```

Set `displayCommand: false` to suppress the `$ command` line entirely.
The command still runs — only the documentation is affected.
Combine with `stdout: { display: true }` to show just the output.

```ts
shellExample('echo "quiet output"', {
  displayCommand: false,
  stdout: { display: true }
})
```
becomes
```sh
quiet output
```

## inputFiles

```ts
shellExample('cat input.txt', {
  inputFiles: [{ path: 'input.txt', content: 'hello world' }]
})
```
becomes
With input file `input.txt`:
```
hello world
```

```sh
$ cat input.txt
```

By default, each input file is introduced with a label with the file name.
Set `displayPath: false` to not mention a file name.

```ts
shellExample('cat input.txt', {
  inputFiles: [{ path: 'input.txt', content: 'hello world', displayPath: false }]
})
```
becomes
```
hello world
```

```sh
$ cat input.txt
```

Set `display: false` to suppress the file content entirely.

```ts
shellExample('cat input.txt', {
  inputFiles: [{ path: 'input.txt', content: 'hello world', display: false }]
})
```
becomes
```sh
$ cat input.txt
```

## outputFiles

By default, output files are captioned with the filename and assertion text.
Set `displayPath: false` to show the content under a generic `Output:` label.

```ts
shellExample('echo "result" > out.txt', {
  outputFiles: [{ path: 'out.txt' }]
})
```
becomes
```sh
$ echo "result" > out.txt
```

Output file `out.txt`:
```
result
```

Set `displayPath: false` to show the content under a generic `Output:` label.

```ts
shellExample('echo "result" > out.txt', {
  outputFiles: [{ path: 'out.txt', displayPath: false }]
})
```
becomes
```sh
$ echo "result" > out.txt
```

Output:
```
result
```

Set `summary: false` to suppress the prose caption entirely —
the file content is shown with no introductory line.

```ts
shellExample('echo "42" > answer.txt', {
  outputFiles: [{ path: 'answer.txt', contains: '42', summary: false }]
})
```
becomes
```sh
$ echo "42" > answer.txt
```

```
42
```

### Asserting stdout

Use `stdout: { contains: '...' }` to assert that stdout contains a substring.

```sh
$ echo "ready"
ready
```

### Asserting file output

Use `outputFiles` to assert that a file created by the command contains expected content.

```sh
$ echo "hello" > greeting.txt
```

Output file `greeting.txt` contains `hello`:
```
hello
```

## Multiple Commands

Join multiple commands with `&&` to run them in sequence and emit a single `sh` block.

```sh
$ echo "first" && echo "second"
```

## With stdout Assertion

Using `shellExample('node --version', { stdout: { contains: '24.11.1' }})` produces:

```sh
$ node --version
24.11.1
```

## With Input and Output Files

`inputFiles` (optionally) creates a file of a given name with specific content
`outputFiles` verifies that specified files exist after the command runs
and contain expected content.

With input file `input.txt`:
```
hello world
```

```sh
$ cp input.txt output.txt
```

Output file `output.txt` contains `hello world`:
```
hello world
```

File contents can assert that they match a regex pattern:

With input file `input.txt`:
```
first line
second line
```

```sh
$ cp input.txt output.txt
```

Output file `output.txt` matches `/^first/`:
```
first line
second line
```

Larger files will display nicely in the emitted markdown, and regex assertions can verify just the relevant part:

With input file `input.txt`:
```
first line
second line
third line
fourth line
```

```sh
$ sort input.txt >output.txt
```

Output file `output.txt` matches `/^first/`:
```
first line
fourth line
second line
third line
```

## Output Files Without Assertions

You can also display output file contents without any `contains` or `matches` assertion:

```sh
$ echo "Hello, World!" > greeting.txt
```

Output file `greeting.txt`:
```
Hello, World!
```

Output files can display with only a `matches` assertion:

```sh
$ echo "version 1.2.3" > version.txt
```

Output file `version.txt` matches `/version \d+\.\d+\.\d+/`:
```
version 1.2.3
```

You can also display stdout without any assertions:

```sh
$ echo "Hello, World!"
```

Stdout can also use regex patterns with `matches`:

```sh
$ echo "version 2.5.1"
```

Stdout can use `contains` with regex patterns:

```sh
$ echo "Error: file not found"
```

File assertions can use `contains` with regex patterns:

```sh
$ echo "config.json" > filename.txt
```

Output file `filename.txt`:
```
config.json
```

File assertions can use `matches` with strings:

```sh
$ echo "success code 0" > result.txt
```

Output file `result.txt`:
```
success code 0
```

Sometimes file names are not important

With input file `input.txt`:
```
first line
second line
third line
fourth line
```

Output file `output.txt` matches `/^first/`:
```
first line
fourth line
second line
third line
```

## With meta Option

Using `shellExample` with `meta: true` outputs the call itself before the command:

```ts
shellExample('echo "meta test"', {
  stdout: {}
})
```
becomes
```sh
$ echo "meta test"
```

With other options and meta:

```ts
shellExample('echo "version 1.2.3" > version.txt', {
  outputFiles: [
    {path: 'version.txt', matches: /version \d+\.\d+\.\d+/}
  ]})
```
becomes
```sh
$ echo "version 1.2.3" > version.txt
```

Output file `version.txt` matches `/version \d+\.\d+\.\d+/`:
```
version 1.2.3
```
