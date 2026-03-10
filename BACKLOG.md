## Acceptance tests
npm run test:update should be `test:acceptance:update`, as it only applies to acceptance tests

## Bring back wait

## If timeout fails, show the feature to extend the timeout.


## PUBLISHING



Current State

- 17/18 assertion methods work functionally (tests must pass to render)
- 94% coverage with functional limitations
- No async/await support in code examples
- Assertion metadata not exposed to documentation

4 Critical Gaps

1. Assertion Metadata Rendering (affects ALL 18 methods)
   - Assertions run silently; no documentation of what was tested
   - 1-2 weeks effort, highest impact
2. Async Assertions (2 missing methods)
   - assert.rejects() and assert.doesNotReject() unsupported
   - Requires async/await support in code examples
   - 2-3 weeks effort
3. Error Object Validation (incomplete)
   - Limited support for complex error matching
   - 2-3 weeks effort
4. Assertion Class Configuration (not supported)
   - new assert.Assert([options]) not available
   - 1 week effort

Deliverables (saved in session workspace)

1. quick_reference.md - 5-minute executive summary
2. gap_analysis.md - 11,200-word comprehensive analysis with code examples
3. implementation_roadmap.md - 5-phase detailed plan with file changes
4. INDEX.md - Master navigation guide
5. SQL tracking table - 18 rows documenting all methods

Total effort for complete feature parity: 6-10 weeks

Start with quick_reference.md or INDEX.md in the session workspace for easy navigation!