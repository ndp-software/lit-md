## Commit Checklist

- [ ] All tests pass and valid Typescript (`npm run verify`)
- [ ] Documentation is updated as needed (see Documentation below)
- [ ] Changelog is updated as needed

## Workflow

Before checking in changes, please run the tests and update snapshots and readme files as needed.

Use:

   > npm run verify

between all changes to confirm that all tests pass, code is valid typescript, and readme and snapshot files are up to date.

## Documentation

After any change, consider what documentation needs to be updated, looking in `./src/docs/README.lit-md.ts`. Do NOT modify ./README.md directly; modify the ts file and run `npm run readme` to update the readme.

There is also a good set of acceptance tests in the acceptance folder. For larger changes add to this suite.

Update CHANGELOG.md with any user-facing changes, and make sure to follow the format of previous entries. PREPEND to the top of the file. If the change is a bug fix, add it under "Fixed". If it's a new feature, add it under "Added". If it's a breaking change, add it under "Breaking Changes". Be sure to include a clear description of the change and its impact on users. Use the categories: CLI, Engine, Markdown Output, DevOps. (if this is insufficient, add a new category here).


## Publishing

In order to publish to NPM, use `npm publish --access=public`.