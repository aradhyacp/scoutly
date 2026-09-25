import { defineTool } from "eve/tools";
import { z } from "zod";
import { TABLE_NAME, COLUMN_NAMES } from "../lib/schema";

/**
 * Statement-level guard for the natural-language query path.
 *
 * Postgres also refuses writes inside the read-only transaction that
 * custom_query_executor opens, so this is the first of two independent barriers,
 * not the only one. It exists to catch a dangerous query early and explain why,
 * rather than letting it fail as a database error.
 */

const FORBIDDEN_KEYWORDS = [
  "insert", "update", "delete", "drop", "alter", "truncate", "create", "grant",
  "revoke", "comment", "copy", "vacuum", "analyze", "reindex", "cluster",
  "refresh", "call", "do", "execute", "prepare", "listen", "notify", "lock",
  "set", "reset", "begin", "commit", "rollback", "savepoint", "pg_sleep",
  "pg_read_file", "pg_ls_dir", "dblink", "lo_import", "lo_export",
];

/** Strip string literals and comments so keyword matching cannot be fooled by text. */
function stripLiteralsAndComments(sql: string): string {
  return sql
    .replace(/--[^\n]*/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/'(?:[^']|'')*'/g, " '' ")
    .replace(/"(?:[^"]|"")*"/g, ' "" ');
}

const outputSchema = z.object({
  safe: z.boolean(),
  violations: z.array(z.string()),
  sql: z.string(),
});

export default defineTool({
  description: [
    "Check that a SQL statement is a safe, read-only query before it is executed.",
    "",
    "Call this on the SQL that custom_query_generator returned, every time, and only run the query if it comes back safe. Never send SQL to custom_query_executor without validating it first.",
    "",
    "A statement is rejected if it is not a single SELECT, if it contains any write or administrative keyword (INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, GRANT, and so on), if it stacks multiple statements, or if it touches any table other than `companies`.",
    "",
    "If it comes back unsafe, do not try to reword the SQL to get past the check. Tell the person what you were blocked from doing.",
  ].join("\n"),
  inputSchema: z.object({
    sql: z.string().min(1).describe("The exact SQL statement to check, as returned by custom_query_generator."),
  }),
  outputSchema,
  label: {
    start: () => "Validate query",
    complete: (_input, output) => (output.safe ? "Query is safe" : `Query blocked: ${output.violations[0]}`),
  },
  execute({ sql }) {
    const violations: string[] = [];
    const trimmed = sql.trim().replace(/;\s*$/, "");
    const stripped = stripLiteralsAndComments(trimmed).toLowerCase();

    if (stripped.includes(";")) {
      violations.push("contains more than one statement");
    }

    if (!/^\s*(select|with)\b/i.test(stripped)) {
      violations.push("is not a SELECT statement");
    }

    for (const keyword of FORBIDDEN_KEYWORDS) {
      if (new RegExp(`\\b${keyword}\\b`).test(stripped)) {
        violations.push(`contains the forbidden keyword "${keyword.toUpperCase()}"`);
      }
    }

    // Names introduced by a WITH clause are valid sources for the rest of the
    // statement, so collect them before checking what the query reads from.
    const cteNames = new Set(
      [...stripped.matchAll(/(?:\bwith\s+|,\s*)([a-z_][a-z0-9_]*)\s+as\s*\(/g)].map((m) => m[1]!),
    );

    // Every identifier that follows FROM or JOIN has to be the companies table
    // or a CTE defined above.
    for (const match of stripped.matchAll(/\b(?:from|join)\s+([a-z0-9_."]+)/g)) {
      const table = match[1]!.replace(/"/g, "").replace(/^public\./, "");
      if (table !== TABLE_NAME && !cteNames.has(table)) {
        violations.push(`reads from "${table}" — only "${TABLE_NAME}" is allowed`);
      }
    }

    if (/\binto\b/.test(stripped)) {
      violations.push("uses INTO, which writes results somewhere");
    }

    return {
      safe: violations.length === 0,
      violations,
      sql: trimmed,
    };
  },
});
