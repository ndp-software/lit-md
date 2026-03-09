import { describe, test } from 'node:test'
import assert, { deepStrictEqual } from 'node:assert/strict'
import { parse } from '../src/parser.ts'
import { render } from '../src/renderer.ts'

describe('--describe option', () => {
  const testCode = `
import { describe, example } from 'test'

describe('Top Level', () => {
  example('test 1', () => {
    assert.equal(1, 1)
  })

  describe('Nested', () => {
    example('test 2', () => {
      assert.equal(2, 2)
    })

    describe('Deep Nested', () => {
      example('test 3', () => {
        assert.equal(3, 3)
      })
    })
  })
})
`

  test('hidden format omits describe names', () => {
    const nodes = parse(testCode, 'typescript')
    const md = render(nodes, 'hidden')
    // Should not contain any describe headers
    if (md.includes('Top Level') || md.includes('Nested') || md.includes('Deep Nested')) {
      throw new Error('Hidden format should not contain describe names')
    }
  })

  test('# format renders describes as H1', () => {
    const nodes = parse(testCode, 'typescript')
    const md = render(nodes, '#')
    // Should contain H1 headers for top level
    if (!md.includes('# Top Level')) {
      throw new Error('Should contain "# Top Level"')
    }
    // Should contain H2 for nested (level + 1)
    if (!md.includes('## Nested')) {
      throw new Error('Should contain "## Nested"')
    }
    // Should contain H3 for deep nested
    if (!md.includes('### Deep Nested')) {
      throw new Error('Should contain "### Deep Nested"')
    }
  })

  test('## format renders describes as H2', () => {
    const nodes = parse(testCode, 'typescript')
    const md = render(nodes, '##')
    // Should contain H2 headers for top level
    if (!md.includes('## Top Level')) {
      throw new Error('Should contain "## Top Level"')
    }
    // Should contain H3 for nested (level + 1)
    if (!md.includes('### Nested')) {
      throw new Error('Should contain "### Nested"')
    }
    // Should contain H4 for deep nested
    if (!md.includes('#### Deep Nested')) {
      throw new Error('Should contain "#### Deep Nested"')
    }
  })

  test('### format renders describes as H3', () => {
    const nodes = parse(testCode, 'typescript')
    const md = render(nodes, '###')
    // Should contain H3 headers for top level
    if (!md.includes('### Top Level')) {
      throw new Error('Should contain "### Top Level"')
    }
    // Should contain H4 for nested
    if (!md.includes('#### Nested')) {
      throw new Error('Should contain "#### Nested"')
    }
    // Should contain H5 for deep nested
    if (!md.includes('##### Deep Nested')) {
      throw new Error('Should contain "##### Deep Nested"')
    }
  })

  test('#### format renders describes as H4', () => {
    const nodes = parse(testCode, 'typescript')
    const md = render(nodes, '####')
    // Should contain H4 headers for top level
    if (!md.includes('#### Top Level')) {
      throw new Error('Should contain "#### Top Level"')
    }
    // Should contain H5 for nested
    if (!md.includes('##### Nested')) {
      throw new Error('Should contain "##### Nested"')
    }
    // Should contain H6 for deep nested
    if (!md.includes('###### Deep Nested')) {
      throw new Error('Should contain "###### Deep Nested"')
    }
  })

  test('Nesting increases header level by 1 for each depth', () => {
    const nodes = parse(testCode, 'typescript')
    const md = render(nodes, '#')
    const lines = md.split('\n')
    
    // Find the headers
    const topLevel = lines.find(l => l === '# Top Level')
    const nested = lines.find(l => l === '## Nested')
    const deepNested = lines.find(l => l === '### Deep Nested')
    
    if (!topLevel || !nested || !deepNested) {
      throw new Error('Expected nesting headers not found')
    }
  })

  test('describe with // keep:full comment in body is still rendered as header', () => {
    // Minimal reproduction: a describe block whose body contains "// keep:full"
    // in a comment should still be rendered as a header, not as raw code.
    const src = `describe('My Section', () => {\n  // keep:full\n})`
    const nodes = parse(src, 'typescript')
    const md = render(nodes, '##')
    assert.ok(md.includes('## My Section'), `Expected "## My Section" but got:\n${md}`)
  })
})
