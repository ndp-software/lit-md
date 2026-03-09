// # Encoder
//
// A TypeScript utility for base64 encoding strings.

import { setDescribeFormat } from '../../../src/index.ts'

setDescribeFormat('hidden')

import { describe, example } from '../../../src/index.ts'
import assert from 'node:assert/strict'
import { encode, decode } from './encoder.ts' // keep

/*
 * ## Basic Usage
 *
 * Pass any string to `encode` and get a base64 result:
 *
 * ```ts
 * import { encode } from './encoder.ts'
 * ```
 */

// file: encode-example.ts
describe('encode', () => {
  example('returns base64', () => {
    const result = encode('hello')
    assert.equal(result, 'aGVsbG8=')
  })

  // You can also encode empty strings:

  example('handles empty string', () => {
    assert.equal(encode(''), '')
  })
})

// ## Round-trip
//
// `decode` reverses `encode`:

describe('decode', () => {
  example('round-trips a string', () => {
    assert.equal(decode(encode('world')), 'world')
  })
})

// ## Illustrative
//
// Chaining is possible but unusual:
//
// ```ts
// const twice = encode(encode('hello'))
// ```
