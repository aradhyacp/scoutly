import { defineTool } from "eve/tools";
import { z } from "zod";
import { runReadOnlyQuery } from "../lib/db";

/**
 * Runs a validated query. The read-only transaction inside `runReadOnlyQuery` is
 * the second barrier behind query_validator: if a statement somehow got this far
 * and tried to write, Postgres itself refuses it.
 */
export default defineTool({
  description: [
    "Run a validated SELECT against the companies database and return the rows.",
    "",
    "Only call this with SQL that query_validator has just returned `safe: true` for, together with the params from custom_query_generator. Do not edit the SQL between validating and executing it.",
    "",
    "Like the other query tools, this belongs to the conversational path only — it is never part of processing a scraped record.",
    "",
    "Results come back as rows. Report every column that came back — do not quietly drop fields because they seem minor. When the answer is a single company, lay out its whole record; when it is several, use a table and say how many matched. Say plainly when a query returned nothing.",
  ].join("\n"),
  inputSchema: z.object({
    sql: z.string().min(1).describe("The validated SQL statement, exactly as query_validator returned it."),
    params: z
      .array(z.unknown())
      .optional()
      .describe("Bound parameter values from custom_query_generator, in order. Omit if there were none."),
  }),
  outputSchema: z.object({
    row_count: z.number(),
    rows: z.array(z.record(z.string(), z.unknown())),
  }),
  label: {
    start: () => "Run query",
    complete: (_input, output) => `${output.row_count} row(s)`,
  },
  async execute({ sql, params }) {
    const { rows, rowCount } = await runReadOnlyQuery(sql, params ?? []);
    return { row_count: rowCount, rows };
  },
});
