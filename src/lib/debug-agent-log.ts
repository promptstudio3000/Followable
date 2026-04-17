/** Dev-only: append NDJSON to .cursor/debug-44cb16.log via API (ingest may be offline). */
export function debugAgentLog(payload: Record<string, unknown>) {
  if (process.env.NEXT_PUBLIC_DEBUG_AGENT_LOG !== "true") {
    return;
  }
  const body = JSON.stringify({ sessionId: "44cb16", timestamp: Date.now(), ...payload });
  fetch("/api/debug-agent-log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  }).catch(() => {});
}
