/**
 * Splits schema.sql into single statements, because Neon's HTTP driver runs one statement per call.
 * Drops comment lines, then splits on the semicolons that end a line. Inside a dollar-quoted body
 * ($$ ... $$, as in DO blocks and functions) nothing is dropped or split, so a body stays one statement.
 */
export function schemaStatements(sqlText: string): string[] {
  const statements: string[] = [];
  let current: string[] = [];
  // The dollar-quote tag still open, like $$ or $body$, or null outside one.
  let open: string | null = null;
  const finish = () => {
    const statement = current.join("\n").replace(/;\s*$/, "").trim();
    if (statement) statements.push(statement);
    current = [];
  };
  for (const line of sqlText.split("\n")) {
    if (!open && line.trim().startsWith("--")) continue;
    for (const [tag] of line.matchAll(/\$[A-Za-z_]*\$/g)) {
      if (!open) open = tag;
      else if (tag === open) open = null;
    }
    current.push(line);
    if (!open && /;\s*$/.test(line)) finish();
  }
  finish();
  return statements;
}
