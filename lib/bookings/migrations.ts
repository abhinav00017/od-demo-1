/**
 * Splits schema.sql into single statements, because Neon's HTTP driver runs one statement per call.
 * Drops comment lines, then splits on the semicolons that end a line.
 */
export function schemaStatements(sqlText: string): string[] {
  return sqlText
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .split(/;\s*$/m)
    .map((s) => s.trim())
    .filter(Boolean);
}
