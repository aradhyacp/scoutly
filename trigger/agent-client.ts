/**
 * Minimal client for the deployed eve agent's HTTP API.
 *
 * Deliberately plain `fetch` rather than `eve/client`: the task only needs to
 * start one turn and read its structured result, and using the SDK would pull
 * the whole eve framework into the trigger.dev image. The agent itself is
 * deployed separately on Vercel; nothing about it belongs in this deployment.
 *
 * The API is asynchronous — POST accepts the turn and returns 202, and the
 * result arrives on the session's NDJSON event stream.
 */

export type AgentConfig = {
  baseUrl: string;
  username: string;
  password: string;
};

function authHeader({ username, password }: AgentConfig): string {
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

/**
 * Run one turn and return its structured result.
 *
 * `outputSchema` is a JSON Schema the runtime forces the model to satisfy
 * before the turn settles, so the caller gets data rather than prose.
 */
export async function runTurn<T>(
  config: AgentConfig,
  message: string,
  outputSchema: Record<string, unknown>,
  options: { timeoutMs?: number } = {},
): Promise<{ sessionId: string; data: T }> {
  const timeoutMs = options.timeoutMs ?? 840_000;
  const deadline = Date.now() + timeoutMs;

  const createResponse = await fetch(`${config.baseUrl}/eve/v1/session`, {
    method: "POST",
    headers: { authorization: authHeader(config), "content-type": "application/json" },
    body: JSON.stringify({ message, outputSchema }),
  });

  if (!createResponse.ok) {
    throw new Error(
      `Agent rejected the session: ${createResponse.status} ${await createResponse.text()}`,
    );
  }

  const { sessionId } = (await createResponse.json()) as { sessionId: string };

  const streamResponse = await fetch(
    `${config.baseUrl}/eve/v1/session/${sessionId}/stream?startIndex=0`,
    {
      headers: { authorization: authHeader(config) },
      signal: AbortSignal.timeout(Math.max(1_000, deadline - Date.now())),
    },
  );

  if (!streamResponse.ok || !streamResponse.body) {
    throw new Error(`Could not stream session ${sessionId}: ${streamResponse.status}`);
  }

  let structured: T | undefined;
  let failure: string | undefined;

  // NDJSON: one event per line, and a chunk can split a line in half, so keep
  // the remainder in the buffer until its newline arrives.
  const reader = streamResponse.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  outer: while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;

      let event: { type: string; data?: Record<string, unknown> };
      try {
        event = JSON.parse(line);
      } catch {
        continue;
      }

      if (event.type === "result.completed") {
        structured = event.data?.result as T;
      } else if (event.type === "turn.failed" || event.type === "session.failed") {
        failure = JSON.stringify(event.data);
        break outer;
      } else if (event.type === "session.waiting" || event.type === "turn.completed") {
        // The turn settled. result.completed always precedes it when an
        // output schema was requested.
        break outer;
      }
    }
  }

  await reader.cancel().catch(() => {});

  if (failure) throw new Error(`Agent turn failed for session ${sessionId}: ${failure}`);
  if (structured === undefined) {
    throw new Error(`Agent produced no structured result for session ${sessionId}`);
  }

  return { sessionId, data: structured };
}
