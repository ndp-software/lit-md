import { shellExample, alias, describe } from '../../src/index.ts'

describe('Aliases', () => {
  // Use `alias` to register a short name for any shell command.
  // In the `.ts` file we have `alias('greet', '/bin/echo')`.
  alias('greet', '/bin/echo')

  describe('Using an Alias', () => {
    // Once registered, the alias name works like any shell command.

    shellExample('greet "hello world"', {
      stdout: { contains: 'hello world' }
    })
  })

  describe('Custom paths', () => {
    // Your package may provide a special CLI or other tool to the users,
    // but you do not want to install it globally in order to generate the
    // documentation. eg. `alias('shout', '~/my-dev/tool7/bin/shout.sh')`.
    // Relative paths in the command string are resolved to absolute paths
    // at registration time, so the alias works regardless of the shell working directory.

    alias('shout', '/usr/bin/tr a-z A-Z')

    shellExample('echo "quiet" | shout', {
      stdout: { contains: 'QUIET' }
    })
  })
})
