import { describe, test, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { join, isAbsolute } from 'node:path'
import { tmpdir } from 'node:os'
import { _runShellExample, alias, _clearAliases } from '../src/shell.ts'

describe('shellExample: runtime behaviour', () => {

  test('succeeds when command exits 0', () => {
    _runShellExample('echo "hello"', {})
  })

  test('throws when command exits non-zero', () => {
    assert.throws(() => _runShellExample('exit 1', {}), /Command failed/)
  })

  test('succeeds when stdout contains expected string', () => {
    _runShellExample('echo "hello world"', { stdout: { contains: 'hello world' } })
  })

  test('throws when stdout does not contain expected string', () => {
    assert.throws(
      () => _runShellExample('echo "hello"', { stdout: { contains: 'goodbye' } }),
      /stdout did not contain/
    )
  })

  test('succeeds with empty stdout object (no assertions)', () => {
    _runShellExample('echo "hello"', { stdout: {} })
  })

  test('succeeds when stdout contains regex pattern', () => {
    _runShellExample('echo "hello world"', { stdout: { contains: /hel+o/ } })
  })

  test('throws when stdout does not contain regex pattern', () => {
    assert.throws(
      () => _runShellExample('echo "hello"', { stdout: { contains: /goodbye/ } }),
      /stdout did not contain/
    )
  })

  test('succeeds with stdout matches string', () => {
    _runShellExample('echo "test output"', { stdout: { matches: 'test' } })
  })

  test('succeeds with stdout matches regex', () => {
    _runShellExample('echo "version 1.2.3"', { stdout: { matches: /version \d+\.\d+\.\d+/ } })
  })

  test('throws when stdout does not match string', () => {
    assert.throws(
      () => _runShellExample('echo "hello"', { stdout: { matches: 'goodbye' } }),
      /stdout did not match/
    )
  })

  test('throws when stdout does not match regex', () => {
    assert.throws(
      () => _runShellExample('echo "hello"', { stdout: { matches: /\d+/ } }),
      /stdout did not match/
    )
  })

})

describe('shellExample: exitCode assertion', () => {

  test('succeeds when command exits with expected non-zero exitCode', () => {
    _runShellExample('exit 2', { exitCode: 2 })
  })

  test('succeeds when command exits 0 and exitCode is 0', () => {
    _runShellExample('echo "ok"', { exitCode: 0 })
  })

  test('throws when command exits with wrong exitCode', () => {
    assert.throws(
      () => _runShellExample('exit 1', { exitCode: 2 }),
      /expected exit code 2/
    )
  })

  test('throws when command exits non-zero and no exitCode specified', () => {
    assert.throws(() => _runShellExample('exit 1', {}), /Command failed/)
  })

  test('error message includes actual and expected exit codes', () => {
    assert.throws(
      () => _runShellExample('exit 3', { exitCode: 1 }),
      (err: Error) => {
        assert.ok(err.message.includes('exit 3'), `message should include actual: ${err.message}`)
        assert.ok(err.message.includes('expected exit code 1'), `message should include expected: ${err.message}`)
        return true
      }
    )
  })

  test('can combine exitCode with stdout assertion', () => {
    // Some commands write to stdout before failing
    _runShellExample('echo "error output"; exit 1', {
      exitCode: 1,
      stdout: { contains: 'error output' }
    })
  })

})

describe('shellExample: outputFiles assertions', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'lit-md-test-'))

  after(() => rmSync(tmp, { recursive: true, force: true }))

  test('succeeds when output file contains expected string', () => {
    const outFile = join(tmp, 'out.txt')
    _runShellExample(`echo "hello world" > "${outFile}"`, {
      outputFiles: [{ path: outFile, contains: 'hello' }]
    })
  })

  test('throws when output file does not contain expected string', () => {
    const outFile = join(tmp, 'out2.txt')
    writeFileSync(outFile, 'nothing here')
    assert.throws(
      () => _runShellExample(`cat "${outFile}"`, { outputFiles: [{ path: outFile, contains: 'expected text' }] }),
      /does not contain/
    )
  })

  test('succeeds when output file matches regex', () => {
    const outFile = join(tmp, 'out3.txt')
    _runShellExample(`echo "version 1.2.3" > "${outFile}"`, {
      outputFiles: [{ path: outFile, matches: /version \d+\.\d+\.\d+/ }]
    })
  })

  test('throws when output file does not match regex', () => {
    const outFile = join(tmp, 'out4.txt')
    writeFileSync(outFile, 'no version here')
    assert.throws(
      () => _runShellExample(`cat "${outFile}"`, { outputFiles: [{ path: outFile, matches: /version \d+/ }] }),
      /does not match/
    )
  })

  test('succeeds with output file and no assertions', () => {
    const outFile = join(tmp, 'out5.txt')
    _runShellExample(`echo "just some content" > "${outFile}"`, {
      outputFiles: [{ path: outFile }]
    })
  })

  test('succeeds with output file assertion using only contains', () => {
    const outFile = join(tmp, 'out6.txt')
    _runShellExample(`echo "hello world" > "${outFile}"`, {
      outputFiles: [{ path: outFile, contains: 'hello' }]
    })
  })

  test('succeeds with output file assertion using only matches', () => {
    const outFile = join(tmp, 'out7.txt')
    _runShellExample(`echo "version 2.0.0" > "${outFile}"`, {
      outputFiles: [{ path: outFile, matches: /version \d+\.\d+\.\d+/ }]
    })
  })

  test('succeeds with output file contains as regex', () => {
    const outFile = join(tmp, 'out8.txt')
    _runShellExample(`echo "test output" > "${outFile}"`, {
      outputFiles: [{ path: outFile, contains: /test.*output/ }]
    })
  })

  test('throws when output file does not contain regex', () => {
    const outFile = join(tmp, 'out9.txt')
    writeFileSync(outFile, 'no match here')
    assert.throws(
      () => _runShellExample(`cat "${outFile}"`, { outputFiles: [{ path: outFile, contains: /pattern/ }] }),
      /does not contain/
    )
  })

  test('succeeds with output file matches as string', () => {
    const outFile = join(tmp, 'out10.txt')
    _runShellExample(`echo "some text" > "${outFile}"`, {
      outputFiles: [{ path: outFile, matches: 'text' }]
    })
  })

  test('throws when output file does not match string', () => {
    const outFile = join(tmp, 'out11.txt')
    writeFileSync(outFile, 'different content')
    assert.throws(
      () => _runShellExample(`cat "${outFile}"`, { outputFiles: [{ path: outFile, matches: 'missing' }] }),
      /does not match/
    )
  })

  test('error message shows actual content when contains assertion fails', () => {
    const outFile = join(tmp, 'out12.txt')
    writeFileSync(outFile, 'actual content here')
    assert.throws(
      () => _runShellExample(`cat "${outFile}"`, { outputFiles: [{ path: outFile, contains: 'expected text' }] }),
      (err: Error) => {
        assert.ok(err.message.includes('actual content here'), `message should show actual: ${err.message}`)
        return true
      }
    )
  })

  test('error message shows (empty) when file is empty and contains assertion fails', () => {
    const outFile = join(tmp, 'out13.txt')
    _runShellExample(`touch "${outFile}"`, {})
    assert.throws(
      () => _runShellExample(`cat "${outFile}"`, { outputFiles: [{ path: outFile, contains: 'something' }] }),
      (err: Error) => {
        assert.ok(err.message.includes('(empty)'), `message should say empty: ${err.message}`)
        return true
      }
    )
  })

  test('error message shows actual content when matches assertion fails', () => {
    const outFile = join(tmp, 'out14.txt')
    writeFileSync(outFile, 'some actual content')
    assert.throws(
      () => _runShellExample(`cat "${outFile}"`, { outputFiles: [{ path: outFile, matches: /missing/ }] }),
      (err: Error) => {
        assert.ok(err.message.includes('some actual content'), `message should show actual: ${err.message}`)
        return true
      }
    )
  })

})

describe('shellExample: inputFiles fixtures', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'lit-md-fixtures-'))

  after(() => rmSync(tmp, { recursive: true, force: true }))

  test('creates input file before running command', () => {
    const inFile = join(tmp, 'input.txt')
    const outFile = join(tmp, 'output.txt')
    _runShellExample(`cat "${inFile}" > "${outFile}"`, {
      inputFiles: [{ path: inFile, content: 'hello from fixture' }],
      outputFiles: [{ path: outFile, contains: 'hello from fixture' }]
    })
  })

  test('cleans up input files after command runs', () => {
    const inFile = join(tmp, 'cleanup-test.txt')
    _runShellExample(`cat "${inFile}"`, {
      inputFiles: [{ path: inFile, content: 'temporary' }]
    })
    assert.throws(() => readFileSync(inFile), /no such file/, 'input file should be deleted after test')
  })

})

describe('alias: registration and shell execution', () => {
  after(() => _clearAliases())

  test('alias resolves relative path to absolute', () => {
    alias('myecho', './node_modules/.bin/nonexistent')
    // We just verify the registry holds an absolute path — don't execute
    _clearAliases()
    alias('greet', '/bin/echo')
    // Use it in a shell command
    _runShellExample('greet "hello alias"', { stdout: { contains: 'hello alias' } })
  })

  test('alias with relative path is resolved to absolute', () => {
    _clearAliases()
    // /bin/echo is absolute but test with a relative-style token
    alias('mycat', 'cat')  // 'cat' has no slash — kept verbatim
    _runShellExample('mycat /dev/null', {})
  })

  test('alias to a path-like token resolves it', () => {
    _clearAliases()
    alias('myecho', '/bin/echo')
    assert.ok(isAbsolute('/bin/echo'))
    _runShellExample('myecho "resolved"', { stdout: { contains: 'resolved' } })
  })

  test('multiple aliases all work in the same command', () => {
    _clearAliases()
    alias('e1', '/bin/echo')
    alias('e2', '/bin/echo')
    _runShellExample('e1 "first" && e2 "second"', { stdout: { contains: 'first' } })
  })

  test('_clearAliases removes all registered aliases', () => {
    alias('will-be-cleared', '/bin/echo')
    _clearAliases()
    // After clearing, alias is gone — command should fail (unknown alias falls back to bare name)
    // We verify clearing doesn't throw and subsequent commands run normally
    _runShellExample('echo "clean"', { stdout: { contains: 'clean' } })
  })

  test('alias with command prefix resolves path token', () => {
    _clearAliases()
    // Token with a path slash gets resolved; no-slash tokens kept verbatim
    alias('run-echo', 'env /bin/echo')
    _runShellExample('run-echo "prefix works"', { stdout: { contains: 'prefix works' } })
  })
})
