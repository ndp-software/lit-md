import { spawnSync } from 'node:child_process'
import { strictEqual } from 'node:assert/strict'
import { describe, example } from '../src/index.ts'

describe('Snapshot Matching Regression', () => {
  example('--match-snapshot should fail when snapshot does not match generated content', () => {
    // This test ensures the snapshot matching regression from March 2026 doesn't happen again.
    // The regression: snapshot files were being written BEFORE validation occurred, so validation
    // always passed (comparing a file against itself). This test verifies snapshot validation
    // correctly fails when content doesn't match.
    
    const result = spawnSync('node', ['./src/cli.ts', '--match-snapshot', '/tmp/temp-regression.lit-md.ts'], {
      cwd: process.cwd(),
      encoding: 'utf-8',
    })
    
    // Should fail with exit code 1 because snapshot doesn't match generated content
    strictEqual(result.status, 1, `Expected exit code 1 (failure), but got ${result.status}. Output: ${result.stdout}`)
    
    // Should show a diff in the output
    const output = result.stdout + result.stderr
    const hasDiff = output.includes('---') || output.includes('+++') || output.includes('Snapshots')
    strictEqual(hasDiff, true, `Expected diff output in: ${output}`)
  })
})
