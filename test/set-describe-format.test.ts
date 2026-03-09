import { describe, test } from 'node:test'
import { deepStrictEqual } from 'node:assert/strict'
import { setDescribeFormat, resetDescribeFormat, getDescribeFormatOverride, resolveDescribeFormat } from '../src/describe-format.ts'

describe('setDescribeFormat', () => {
  test('sets and retrieves describe format override', () => {
    resetDescribeFormat()
    setDescribeFormat('##')
    deepStrictEqual(getDescribeFormatOverride(), '##')
  })

  test('resolves format with no override returns CLI format', () => {
    resetDescribeFormat()
    deepStrictEqual(resolveDescribeFormat('#'), '#')
    deepStrictEqual(resolveDescribeFormat('hidden'), 'hidden')
  })

  test('resolves format with override returns override', () => {
    resetDescribeFormat()
    setDescribeFormat('###')
    deepStrictEqual(resolveDescribeFormat('#'), '###')
    deepStrictEqual(resolveDescribeFormat('hidden'), '###')
  })

  test('resets format override', () => {
    setDescribeFormat('####')
    deepStrictEqual(getDescribeFormatOverride(), '####')
    resetDescribeFormat()
    deepStrictEqual(getDescribeFormatOverride(), undefined)
  })

  test('warns when called multiple times with different formats', () => {
    resetDescribeFormat()
    let warnCalled = false
    const originalWarn = console.warn
    console.warn = (msg: string) => {
      if (msg.includes('setDescribeFormat called multiple times')) {
        warnCalled = true
      }
    }
    
    setDescribeFormat('#')
    setDescribeFormat('##')
    
    console.warn = originalWarn
    if (!warnCalled) {
      throw new Error('Expected warning when calling setDescribeFormat multiple times')
    }
  })
})
