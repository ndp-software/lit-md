/**
 * Test file demonstrating async/await patterns in lit-md code examples.
 *
 * This file contains 4 representative examples showing both:
 * 1. Patterns that work with current lit-md (Examples 1-2)
 * 2. Aspirational patterns that need Phase 2 async implementation (Examples 3-4)
 *
 * These tests serve as:
 * - Reference implementation for async support in lit-md
 * - Documentation of expected async behavior
 * - Regression tests once async features are implemented
 *
 * Related:
 * - gap_analysis.md: Gap 1 (Async Assertions)
 * - implementation_roadmap.md: Phase 2 (Async Support)
 */

import { describe, example } from '../src/index.ts'
import assert from 'node:assert/strict'

describe('Async/Await Examples', () => {
  /*
   * ============================================================================
   * EXAMPLE 1: Basic Async/Await - Async function that resolves with a value
   * ============================================================================
   *
   * Status: UNKNOWN - May work with current lit-md
   * Tests: Basic async/await syntax with Promise resolution
   *
   * This example demonstrates:
   * - Defining an async function
   * - Using await to resolve a Promise
   * - Asserting the resolved value
   *
   * Expected behavior:
   * - If lit-md supports async functions in examples, this should pass
   * - The async function should be awaited during execution
   * - The assertion on the resolved value should work
   */
  example('async function resolves with a value', async () => {
    // Define a simple async function that returns a Promise
    const asyncFunc = async (): Promise<number> => Promise.resolve(42)

    // Await the function result
    const result = await asyncFunc()

    // Assert the resolved value
    assert.strictEqual(result, 42)
  })

  /*
   * ============================================================================
   * EXAMPLE 2: Promise Chain - Multiple steps with traditional .then()
   * ============================================================================
   *
   * Status: EXPECTED TO WORK - Should work with current lit-md
   * Tests: Traditional Promise chaining pattern
   *
   * This example demonstrates:
   * - Chaining multiple Promise operations with .then()
   * - Transforming values through the chain
   * - Asserting within the chain
   * - Returning a Promise from the example
   *
   * Expected behavior:
   * - This pattern should work even if async/await isn't fully supported
   * - The example returns a Promise that the test runner can await
   * - Multiple .then() calls show sequential async operations
   * - The final assertion validates the transformed result
   *
   * Why this works: The example function returns a Promise, which is compatible
   * with most test runners including node --test.
   */
  example('promise chain with multiple steps', () => {
    return Promise.resolve(10)
      .then(x => {
        assert.strictEqual(x, 10)
        return x * 2
      })
      .then(x => {
        assert.strictEqual(x, 20)
        return x + 5
      })
      .then(x => {
        assert.strictEqual(x, 25)
      })
  })

  /*
   * ============================================================================
   * EXAMPLE 3: Assert.rejects() - Error validation for Promise rejection
   * ============================================================================
   *
   * Status: ASPIRATIONAL - Requires Phase 2 implementation
   * Related gap: Gap 2 - Error Object Validation
   *
   * This example demonstrates:
   * - Using assert.rejects() to validate Promise rejection
   * - Validating error type (name property)
   * - Validating error message
   * - Checking specific error properties
   *
   * Expected behavior (once implemented):
   * - assert.rejects() should be available in code examples
   * - It should catch the Promise rejection
   * - It should validate the error matches the provided matcher
   * - Multiple error properties can be validated
   *
   * Current blocker:
   * - lit-md needs to support:
   *   1. async functions in examples (Phase 2 item 1)
   *   2. Complex error object validation (Phase 2 item 2)
   *   3. Proper error handling in assertion execution (Phase 2 item 3)
   *
   * This pattern is critical for documenting error scenarios in TypeScript/Node.js
   * libraries, as error rejection is a fundamental async pattern.
   */
  example('tests promise rejection with assert.rejects()', async () => {
    // Define an async function that throws an error
    const rejectionFunc = async (): Promise<never> => {
      throw new TypeError('Invalid input type')
    }

    // Use assert.rejects() to validate the Promise rejection and error properties
    // This validates:
    // - That the function throws (returns rejected Promise)
    // - That the error name is 'TypeError'
    // - That the error message is exactly 'Invalid input type'
    await assert.rejects(
      rejectionFunc(),
      {
        name: 'TypeError',
        message: 'Invalid input type'
      }
    )
  })

  /*
   * ============================================================================
   * EXAMPLE 4: Assert.doesNotReject() - Success validation for Promise
   * ============================================================================
   *
   * Status: ASPIRATIONAL - Requires Phase 2 implementation
   * Related gap: Gap 2 - Error Object Validation (complementary)
   *
   * This example demonstrates:
   * - Using assert.doesNotReject() to validate Promise success
   * - Validating that a function returns a resolved Promise
   * - Chaining the resolved value for further assertions
   * - Combining error prevention with result validation
   *
   * Expected behavior (once implemented):
   * - assert.doesNotReject() should be available in code examples
   * - It should return (or await) the resolved value
   * - Further assertions can be performed on the result
   * - The function should succeed without throwing
   *
   * Current blocker:
   * - lit-md needs to support:
   *   1. async functions in examples (Phase 2 item 1)
   *   2. assert.doesNotReject() execution (Phase 2 item 2)
   *   3. Chaining results from async validations (Phase 2 item 3)
   *
   * Use case:
   * This pattern is useful for documenting "happy path" scenarios where:
   * - A function should complete successfully
   * - The result should meet certain criteria
   * - Any thrown error should cause the test to fail
   *
   * Example: Validating that an API call succeeds and returns expected data
   */
  example('tests promise success with assert.doesNotReject()', async () => {
    // Define an async function that validates input and returns a result
    const successFunc = async (value: number): Promise<number> => {
      if (value < 0) {
        throw new Error('Must be positive')
      }
      return value * 2
    }

    // Use assert.doesNotReject() to ensure the function doesn't throw
    // Note: assert.doesNotReject() returns a void Promise, not the resolved value
    await assert.doesNotReject(successFunc(5))

    // To validate the actual result, call the function separately
    const result = await successFunc(5)
    assert.strictEqual(result, 10)
  })
})

/*
 * ============================================================================
 * SUMMARY OF EXAMPLES
 * ============================================================================
 *
 * Example 1 & 2: Working Patterns
 * ────────────────────────────────
 * These demonstrate async patterns that should work (or partially work) with
 * current lit-md. They serve as baselines for async support verification.
 *
 * Example 3 & 4: Aspirational Patterns
 * ───────────────────────────────────
 * These demonstrate patterns that need Phase 2 implementation. They show:
 * - The gaps in current async support
 * - The error handling scenarios that need work
 * - Real-world usage patterns for async validation
 *
 * Implementation Notes:
 * ────────────────────
 * - All examples use proper TypeScript typing
 * - Each example has clear documentation of its status and purpose
 * - Comments explain both the pattern and the current limitations
 * - Links back to gap analysis for context
 *
 * Testing Strategy:
 * ─────────────────
 * Run with: node --test test/async.test.ts
 *
 * Expected results:
 * - Example 1: May pass or fail depending on lit-md async support
 * - Example 2: Expected to pass (returns Promise, no special async handling)
 * - Example 3: Expected to fail (needs Phase 2 implementation)
 * - Example 4: Expected to fail (needs Phase 2 implementation)
 *
 * Once Phase 2 is implemented:
 * - Examples 3 & 4 should pass
 * - All examples will serve as regression tests
 *
 * Future enhancements:
 * - Add concurrent Promise tests (Promise.all, Promise.race)
 * - Add timeout tests
 * - Add nested Promise scenarios
 * - Add custom error validation functions
 */
