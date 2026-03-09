## shellExample

`shellExample` provides a more structured way to include shell commands,
  with support for
  - input file generation and
  - output file assertions, and
  - more detailed stdout assertions.

```ts
shellExample('echo "hello world"', { stdout: {display: true}})
```
becomes
```sh
$ echo "hello world"
hello world
```

Can contain assertions on stdout, which appear as comments in the emitted markdown.
Assertions can use `contains` or `matches`, with either strings or regex patterns.
```ts
shellExample('echo "ok"', {stdout: {contains: 'ok'}})
```

stdout.matches provides an alternative assertion method:
```ts
shellExample('echo "version 1.0.0"', {stdout: {matches: /version \d+\.\d+\.\d+/}})
```

Can provide input files that are created before the command runs,
and output file assertions that check for files created by the command and their contents.
```ts
shellExample('cp input.txt output.txt', {
  inputFiles: [{path: 'input.txt', content: 'hello world'}],
  outputFiles: [{path: 'output.txt', contains: 'hello world'}]
})
```

Output file assertions can check contents with `contains` (substring or regex) or `matches` (regex or string).
Both properties are optional — you can specify just one, or display file contents without assertions.
```ts
shellExample('cp input.txt output.txt', {
  inputFiles: [{path: 'input.txt', content: 'first line\nsecond line'}],
  outputFiles: [{path: 'output.txt', matches: /^first/}]
})
```

File assertions can also use regex in contains or strings in matches:
```ts
shellExample('cp input.txt output.txt', {
  inputFiles: [{path: 'input.txt', content: 'data.json'}],
  outputFiles: [{path: 'output.txt', contains: /\.json/}]
})
```

You can even output the output file contents, or the stdout:
```ts
shellExample('echo "Hello, World!" | tee greeting.txt', {
  stdout: {
    contains: "Hello",
    display: true /* outputs standard out after the command */
  },
  outputFiles: [{
    contains: 'Hello',
    path: 'greeting.txt',
    // display: true, /* by default display, but suppress with `display: false` */
    summary: true
  }]
})
```

```sh
$ echo "Hello, World!" | tee greeting.txt
Hello, World!
```

Output file `greeting.txt` contains `Hello`:
```
Hello, World!
```

You can also display the `shellExample` call itself in the output using the `meta` option:
```ts
shellExample('echo "Hello, World!"', {
      meta: true,
      stdout: {}
    })
```

```ts
shellExample('echo "Hello, World!"', {
    stdout: {}
  })
```
becomes
```sh
$ echo "Hello, World!"
```

Input and output files can display their contents:
```ts
shellExample('cat input.txt', {
      inputFiles: [{
        path: 'input.txt',
        content: 'File contents to display',
        display: true,  // Show file contents in output
        displayPath: true,
        summary: true
      }],
      stdout: {display: true}
    })
```

### Advanced Usage

shellExample provides more control and structured options for shell command examples. Use when you need to:

    - Capture and display stdout dynamically
    - Create input files before running
    - Assert output files match patterns
    - Hide/customize what's displayed
    - Show the function call itself with `meta: true`
```ts
shellExample('echo "hello world"')
```

With Assertions
```ts
shellExample('echo "ok"', {
      stdout: {contains: 'ok'}
    })
```

Exit Code Assertions
```ts
shellExample('echo "success"', {
      exitCode: 0,
      stdout: {display: true}
    })

shellExample('false', {
      exitCode: 1
    })

shellExample('true', {
      exitCode: 0,
      stdout: {display: true}
    })
```

Input and Output Files
```ts
shellExample('cat input.txt > output.txt', {
      inputFiles: [
        {path: 'input.txt', content: 'Hello'}
      ],
      outputFiles: [
        {path: 'output.txt', matches: /Hello/}
      ]
    })
```

Timeout Configuration
```ts
shellExample('echo "quick"', {
      timeout: 3000,
      stdout: {display: true}
    })

shellExample('echo "instant"', {
      timeout: 500,
      stdout: {display: true}
    })
```

Options Reference

    #### displayCommand

    - Type: `boolean` | `'hidden'`
    - When 'hidden' or false, command is executed but not shown in output
    - Default: true (command is shown)

    #### stdout

    - Type: { contains?: string | RegExp; matches?: string | RegExp; display?: boolean }
    - `contains`: Assert output contains this string or matches regex pattern (optional)
    - `matches`: Assert output matches this string (substring) or regex pattern (optional)
    - `display`: When true, dynamically execute and show actual stdout (default: false)
    - At least one of contains/matches is typically specified, but both are optional

    #### outputFiles

    Array of output file assertions:

    - `path`: File path (relative to temp directory)
    - `contains`: String or regex to check if file contains this value (optional)
    - `matches`: String or regex to check if file matches this value (optional)
    - `displayPath`: Show the filename (default: true)
    - `summary`: Show summary line before contents (default: true)

    #### inputFiles

    Array of input files to create:

    - `path`: File path
    - `content`: File contents
    - `displayPath`: Show the filename (default: true)
    - `display`: Show the file contents (default: true)
    - `summary`: Show summary line (default: true)

    #### exitCode

    - Type: `number`
    - Asserts the command exits with this specific code
    - When not specified, expects exit code 0 (success)
    - Useful for testing expected failures (e.g., exitCode: 1)
    - If actual exit code doesn't match, command fails with detailed error message

    #### timeout

    - Type: `number`
    - Command timeout in milliseconds
    - Default: 3000 (3 seconds)
    - If command runs longer than timeout, throws ETIMEDOUT error
    - Useful for preventing infinite loops or very long-running commands

    #### meta

    - Type: `boolean`
    - When true, outputs a fenced code block showing the `shellExample` call itself before the command output
    - The `meta: true` option is removed from the reconstructed call for cleaner documentation
    - Default: false (only shows the command and its output)
    - Useful for showing both the code and its result in documentation

    #### Example with All Options
```ts
shellExample(
        'cat input.txt && echo "Done" | tee result.log', {
          displayCommand: true,
          inputFiles: [
            {path: 'input.txt', content: 'Config data', displayPath: true, display: true, summary: true}
          ],
          stdout: {
            contains: 'Done',
            display: true,  // Show actual output
            matches: /Done/ // Both contains and matches are optional
          },
          outputFiles: [
            {path: 'result.log', matches: /Done/, displayPath: true, summary: true}
          ],
          exitCode: 0,  // Assert successful exit
          timeout: 5000  // Set 5 second timeout
        })
```
