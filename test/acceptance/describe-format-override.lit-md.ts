import { setDescribeFormat, describe, example } from '../../src/index.ts'

// Override the CLI format for this file - should render as H3 headers
// even though CLI says to use # (H1)
setDescribeFormat('###')

describe('Override Test', () => {
  example('test 1', () => {
    const x = 1
  })

  describe('Nested', () => {
    example('nested test', () => {
      const y = 2
    })
  })
})
