/**
 * Parses a JSON tool arguments string into a plain object.
 * Returns null if the string is invalid JSON or not a plain object.
 */
export function parseToolArgs(
  args: string | undefined,
): Record<string, unknown> | null {
  try {
    const parsed = args ? JSON.parse(args) : {}
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
  } catch {
    // fall through
  }
  return null
}
