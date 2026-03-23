/**
 * Code example identifiers (all exported for documentation use)
 * 
 * **Test/Example Identifiers (for code examples):**
 * - `test` - Standard test identifier
 * - `example` - Alias for test, emphasizes documentation purpose
 * - `spec` - BDD-style alias for test (from Jasmine/Jest patterns)
 * - `it` - BDD-style alias for test (from RSpec/Mocha patterns)
 * 
 * **Grouping Identifiers (for organizing examples):**
 * - `describe` - Standard grouping identifier
 * - `context` - Alias for describe (from RSpec patterns)
 * - `suite` - Alias for describe (from testing framework patterns)
 * 
 * **Special Functions:**
 * - `metaExample` - Shows how example rendering transforms assertions to readable output
 * - `shellExample` - Executes shell commands and validates output in documentation
 * - `alias` - Register shell command aliases for use in shellExample calls
 * - `stripTypesFlag` - Get Node.js flag for TypeScript stripping when needed
 */
export {
  suite, describe, context,
  test, example, spec, it,
  metaExample, shellExample,
  alias,
  stripTypesFlag
} from './shell.ts'

/**
 * Shell example configuration options for advanced assertions and behavior control
 * - ShellExampleOpts: Configuration for shell command execution
 * - ShellFileAssertion: Options for validating output files
 */
export type { ShellExampleOpts, ShellFileAssertion } from './shell.ts'

/**
 * Set the heading format for describe() block titles.
 * Controls whether headings appear as ## (h2), ### (h3), etc.
 */
export { setDescribeFormat } from './describe-format.ts'

/**
 * Valid describe format types
 */
export type { DescribeFormatType } from './describe-format.ts'
