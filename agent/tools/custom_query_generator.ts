import { defineTool } from "eve/tools";
import { z } from "zod";
import { COLUMN_NAMES, TABLE_NAME, isColumn } from "../lib/schema";

/**
 * Builds the SQL for the natural-language query path.
 *
 * The model describes what it wants as structured intent and this tool writes the
 * statement, so values become bound parameters and identifiers are checked
 * against the real column list. `raw_sql` is the escape hatch for questions the
 * structured form cannot express (aggregates, GROUP BY); it is passed through
 * untouched, which is exactly why query_validator runs on the result either way.
 */

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 200;

const columnEnum = z.enum(COLUMN_NAMES as [string, ...string[]]);

const filterSchema = z.object({
  column: columnEnum.describe("Column to filter on."),
  operator: z
    .enum([
      "eq", "neq", "lt", "lte", "gt", "gte",
      "contains", "starts_with", "in", "is_null", "is_not_null",
    ])
    .describe(
      "Comparison to apply. Use `contains` for case-insensitive text search, `in` with a list of values, and `is_null` / `is_not_null` with no value.",
    ),
  value: z
    .union([z.string(), z.number(), z.boolean(), z.array(z.union([z.string(), z.number()]))])
    .optional()
    .describe("Value to compare against. Omit for is_null and is_not_null. Use an array with the `in` operator."),
});

const outputSchema = z.object({
  sql: z.string(),
  params: z.array(z.unknown()),
  explanation: z.string(),
});

function buildCondition(
  filter: z.infer<typeof filterSchema>,
  params: unknown[],
): string {
  const { column, operator, value } = filter;

  if (!isColumn(column)) {
    throw new Error(`Unknown column "${column}". Available columns: ${COLUMN_NAMES.join(", ")}`);
  }

  if (operator === "is_null") return `${column} IS NULL`;
  if (operator === "is_not_null") return `${column} IS NOT NULL`;

  if (value === undefined) {
    throw new Error(`The "${operator}" operator on "${column}" needs a value.`);
  }

  if (operator === "in") {
    if (!Array.isArray(value) || value.length === 0) {
      throw new Error(`The "in" operator on "${column}" needs a non-empty array of values.`);
    }
    params.push(value);
    return `${column} = ANY($${params.length})`;
  }

  if (Array.isArray(value)) {
    throw new Error(`The "${operator}" operator on "${column}" takes a single value, not an array.`);
  }

  if (operator === "contains") {
    params.push(`%${value}%`);
    return `${column}::text ILIKE $${params.length}`;
  }

  if (operator === "starts_with") {
    params.push(`${value}%`);
    return `${column}::text ILIKE $${params.length}`;
  }

  const sqlOperator = { eq: "=", neq: "<>", lt: "<", lte: "<=", gt: ">", gte: ">=" }[operator];
  params.push(value);
  return `${column} ${sqlOperator} $${params.length}`;
}

export default defineTool({
  description: [
    `Turn a question about the stored companies into SQL against the \`${TABLE_NAME}\` table.`,
    "",
    "Use this only when a person is asking you something in conversation — for example \"pull up info on company xyz\", \"how many fintech companies do we have\", \"which ones are B2B in Germany\". It has no part in the ingestion pipeline; never call it while processing a scraped record.",
    "",
    "Describe what you want with `filters`, `columns`, `order_by`, and `limit` and this tool writes the statement with bound parameters. Fall back to `raw_sql` only for things the structured form cannot express, such as COUNT/AVG with GROUP BY.",
    "",
    `Available columns: ${COLUMN_NAMES.join(", ")}.`,
    "",
    "The SQL it returns is not yet approved to run. Pass it to query_validator next, then to custom_query_executor.",
  ].join("\n"),
  inputSchema: z.object({
    question: z
      .string()
      .min(1)
      .describe("The person's question in their own words, so the generated SQL can be explained back to them."),
    columns: z
      .array(columnEnum)
      .optional()
      .describe(
        "Columns to return. Leave this out to get every column, which is the right default — a person asking about a company wants the whole record, not a subset. Only narrow it when the question is explicitly about one or two fields, or when you are aggregating.",
      ),
    filters: z.array(filterSchema).optional().describe("Conditions, combined with AND."),
    order_by: z
      .object({
        column: columnEnum,
        direction: z.enum(["asc", "desc"]).default("desc"),
      })
      .optional(),
    limit: z
      .number()
      .int()
      .positive()
      .max(MAX_LIMIT)
      .optional()
      .describe(`Row cap. Defaults to ${DEFAULT_LIMIT}, maximum ${MAX_LIMIT}.`),
    raw_sql: z
      .string()
      .optional()
      .describe(
        `Escape hatch for aggregates and grouping the structured fields cannot express. A single read-only SELECT against ${TABLE_NAME} only. When set, the other fields are ignored.`,
      ),
  }),
  outputSchema,
  label: {
    start: ({ question }) => `Generate query: ${question}`,
  },
  execute(input) {
    if (input.raw_sql) {
      return {
        sql: input.raw_sql.trim().replace(/;\s*$/, ""),
        params: [],
        explanation: "Passed through as authored SQL; it still has to clear query_validator.",
      };
    }

    const params: unknown[] = [];

    // Default to the whole row. Under-selecting is the more common failure: the
    // person asks about a company and gets back three of its fourteen fields.
    const selected = input.columns?.length ? input.columns : COLUMN_NAMES;

    const conditions = (input.filters ?? []).map((filter) => buildCondition(filter, params));

    const clauses = [`SELECT ${selected.join(", ")}`, `FROM ${TABLE_NAME}`];

    if (conditions.length > 0) {
      clauses.push(`WHERE ${conditions.join(" AND ")}`);
    }

    if (input.order_by) {
      clauses.push(`ORDER BY ${input.order_by.column} ${input.order_by.direction.toUpperCase()}`);
    }

    const limit = input.limit ?? DEFAULT_LIMIT;
    clauses.push(`LIMIT ${limit}`);

    return {
      sql: clauses.join(" "),
      params,
      explanation: `Answers "${input.question}" with ${conditions.length} filter(s), returning at most ${limit} rows.`,
    };
  },
});
