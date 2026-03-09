## Aliases

Use `alias` to register a short name for any shell command.
In the `.ts` file we have `alias('greet', '/bin/echo')`.

### Using an Alias

Once registered, the alias name works like any shell command.

```sh
$ greet "hello world"
hello world
```

### Custom paths

Your package may provide a special CLI or other tool to the users,
but you do not want to install it globally in order to generate the
documentation. eg. `alias('shout', '~/my-dev/tool7/bin/shout.sh')`.
Relative paths in the command string are resolved to absolute paths
at registration time, so the alias works regardless of the shell working directory.

```sh
$ echo "quiet" | shout
QUIET
```
