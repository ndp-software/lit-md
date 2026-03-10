export type DescribeFormatType = 'hidden' | '#' | '##' | '###' | '####' | 'auto'

let overrideFormat: DescribeFormatType | undefined = undefined

/**
 * Set the describe format for the current file, overriding the CLI --describe option.
 * This must be called at the top of the file, before any examples or describes.
 * 
 * @param format - The format to use for rendering describe() block names:
 *   - 'hidden': omit describe names (default)
 *   - '#', '##', '###', '####': render as H1-H4 headers with nesting support
 *   - 'auto': dynamically determine level based on document structure (h1 if no headers exist, else one level deeper than last header)
 * 
 * @example
 * ```ts
 * import { setDescribeFormat } from '@ndp-software/lit-md'
 * setDescribeFormat('##')
 * // All describe() blocks in this file will be rendered as H2+ headers
 * ```
 */
export function setDescribeFormat(format: DescribeFormatType): void {
  if (overrideFormat !== undefined && overrideFormat !== format) {
    console.warn(`setDescribeFormat called multiple times with different formats: ${overrideFormat} -> ${format}. Only the last call will be used.`)
  }
  overrideFormat = format
}

/**
 * Get the current describe format override (if any).
 * Returns undefined if no override has been set.
 * @internal
 */
export function getDescribeFormatOverride(): DescribeFormatType | undefined {
  return overrideFormat
}

export function resetDescribeFormat(): void {
  overrideFormat = undefined
}

export function resolveDescribeFormat(cliFormat: string): string {
  return overrideFormat ?? cliFormat
}
