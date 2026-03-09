import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, unlinkSync, existsSync, mkdirSync, rmSync } from 'fs'
import { execFileSync, spawnSync } from 'child_process'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))
const cli = join(__dir, '../src/cli.ts')

function runCli(args: string[], opts: { expectFail?: boolean } = {}): { stdout: string; stderr: string; status: number } {
  const result = spawnSync(process.execPath, ['--experimental-strip-types', cli, ...args], {
    env: process.env,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  if (!opts.expectFail && result.status !== 0) {
    throw new Error(`CLI failed (exit ${result.status}):\n${result.stderr}`)
  }
  return { stdout: result.stdout ?? '', stderr: result.stderr ?? '', status: result.status ?? 0 }
}

describe('integration: lit-md CLI end-to-end', () => {

  test('generates README.md from encoder fixture and matches expected output', () => {
    const fixtureDir = join(__dir, 'fixtures/encoder')
    const inputFile = join(fixtureDir, 'README.ts')
    const expectedFile = join(fixtureDir, 'README.md')
    const outputFile = join(fixtureDir, 'README.generated.md')

    execFileSync(process.execPath, ['--experimental-strip-types', cli, inputFile, '--out', outputFile], { env: process.env })

    const generated = readFileSync(outputFile, 'utf8').trim()
    const expected = readFileSync(expectedFile, 'utf8').trim()
    try { unlinkSync(outputFile) } catch {}

    assert.equal(generated, expected)
  })

  test('multiple input files: generates one .md per input (using --outDir)', () => {
    const outDir = join(__dir, 'fixtures/_multi_file_test')
    const input1 = join(__dir, 'acceptance/basic-prose.lit-md.ts')
    const input2 = join(__dir, 'acceptance/code-blocks.lit-md.ts')
    try {
      runCli(['--outDir', outDir, input1, input2])
      assert.ok(existsSync(join(outDir, 'basic-prose.md')), 'first output exists')
      assert.ok(existsSync(join(outDir, 'code-blocks.md')), 'second output exists')
    } finally {
      try { rmSync(outDir, { recursive: true }) } catch {}
    }
  })

  test('--out errors when multiple input files given', () => {
    const { stderr, status } = runCli([
      '--out', '/tmp/x.md',
      join(__dir, 'acceptance/basic-prose.lit-md.ts'),
      join(__dir, 'acceptance/code-blocks.lit-md.ts'),
    ], { expectFail: true })
    assert.equal(status, 1)
    assert.ok(stderr.includes('--out can only be used with a single input file'))
  })

  test('--outDir: places all outputs in specified directory', () => {
    const outDir = join(__dir, 'fixtures/_outputdir_test')
    const input1 = join(__dir, 'acceptance/basic-prose.lit-md.ts')
    const input2 = join(__dir, 'acceptance/code-blocks.lit-md.ts')
    try {
      runCli(['--outDir', outDir, input1, input2])
      assert.ok(existsSync(join(outDir, 'basic-prose.md')))
    } finally {
      try { rmSync(outDir, { recursive: true }) } catch {}
    }
  })

  test('--outDir creates directory if it does not exist', () => {
    const outDir = join(__dir, 'fixtures/_new_dir_test')
    const input = join(__dir, 'acceptance/basic-prose.lit-md.ts')
    try {
      assert.ok(!existsSync(outDir), 'dir should not exist before test')
      runCli(['--outDir', outDir, input])
      assert.ok(existsSync(join(outDir, 'basic-prose.md')))
    } finally {
      try { rmSync(outDir, { recursive: true }) } catch {}
    }
  })

  test('--dryrun: prints "would write" to stderr and does not create file', () => {
    const input = join(__dir, 'acceptance/basic-prose.lit-md.ts')
    const expectedOut = input.replace('.ts', '.md')
    try {
      unlinkSync(expectedOut)
    } catch {}
    const { stderr } = runCli(['--dryrun', input])
    assert.ok(stderr.includes('dry run: would write'), 'prints dry run message to stderr')
    assert.ok(!existsSync(expectedOut), 'does not write file')
  })

  test('--test: runs tests and proceeds to generate on success', () => {
    const input = join(__dir, 'acceptance/basic-prose.lit-md.ts')
    const outputFile = input.replace('.lit-md.ts', '.generated.md')
    try {
      const { stderr } = runCli(['--test', '--out', outputFile, input])
      assert.ok(stderr.includes('Generated'), 'generated file')
      assert.ok(existsSync(outputFile))
    } finally {
      try { unlinkSync(outputFile) } catch {}
    }
  })

  test('--typecheck: succeeds on valid .ts file', () => {
    const input = join(__dir, 'acceptance/basic-prose.lit-md.ts')
    const { stderr } = runCli(['--typecheck', '--dryrun', input])
    assert.ok(stderr.includes('dry run: would write'))
  })

  test('default (no --out, no --outDir): outputs to stdout', () => {
    const input = join(__dir, 'acceptance/basic-prose.lit-md.ts')
    const { stdout, stderr } = runCli([input])
    assert.ok(stdout.includes('Basic Prose'), 'markdown content in stdout')
    assert.ok(!stderr.includes('Generated'), 'no "Generated" message')
  })

  test('with --outDir: creates file in directory (not stdout for markdown)', () => {
    const outDir = join(__dir, 'fixtures/_stdout_test')
    const input = join(__dir, 'acceptance/basic-prose.lit-md.ts')
    try {
      const { stdout, stderr } = runCli(['--outDir', outDir, input])
      assert.ok(!stdout.includes('Basic Prose'), 'markdown content NOT in stdout')
      assert.ok(stderr.includes('Generated'), 'writes to file with message')
      assert.ok(existsSync(join(outDir, 'basic-prose.md')))
    } finally {
      try { rmSync(outDir, { recursive: true }) } catch {}
    }
  })

  test('with --out: creates file (not stdout for markdown)', () => {
    const outputFile = join(__dir, 'fixtures/_stdout_test.md')
    const input = join(__dir, 'acceptance/basic-prose.lit-md.ts')
    try {
      const { stdout, stderr } = runCli(['--out', outputFile, input])
      assert.ok(!stdout.includes('Basic Prose'), 'markdown content NOT in stdout')
      assert.ok(stderr.includes('Generated'), 'writes to file with message')
      assert.ok(existsSync(outputFile))
    } finally {
      try { unlinkSync(outputFile) } catch {}
    }
  })

  test('unknown option causes error and exits', () => {
    const input = join(__dir, 'acceptance/basic-prose.lit-md.ts')
    const { stderr, status } = runCli(['--unknown-option', input], { expectFail: true })
    assert.equal(status, 1)
    assert.ok(stderr.includes('error: unknown option'))
    assert.ok(stderr.includes('--unknown-option'))
  })

  test('typo in known option (e.g., --typcheck instead of --typecheck) causes error', () => {
    const input = join(__dir, 'acceptance/basic-prose.lit-md.ts')
    const { stderr, status } = runCli(['--typcheck', input], { expectFail: true })
    assert.equal(status, 1)
    assert.ok(stderr.includes('error: unknown option'))
    assert.ok(stderr.includes('--typcheck'))
  })

  test('multiple unknown options shows all of them in error', () => {
    const input = join(__dir, 'acceptance/basic-prose.lit-md.ts')
    const { stderr, status } = runCli(['--unknown1', '--unknown2', input], { expectFail: true })
    assert.equal(status, 1)
    assert.ok(stderr.includes('error: unknown options'))
    assert.ok(stderr.includes('--unknown1'))
    assert.ok(stderr.includes('--unknown2'))
  })

})

