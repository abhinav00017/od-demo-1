/**
 * Ogi's log lines. Every tool call is logged with the page, role, tool and outcome, never the visitor's words or
 * phone number. `redact` is a second guard: any run of 7 or more digits becomes "•••" before it reaches the log.
 */
export function redact(text: string) {
  return text.replace(/\+?\d[\d\s().-]{5,}\d/g, (m) => (m.replace(/\D/g, "").length >= 7 ? "•••" : m));
}

export type OgiLogEvent = {
  event: "tool" | "reply_blocked" | "emergency" | "model_error" | "denied_tool";
  page: string;
  role: string;
  tool?: string;
  outcome?: string;
};

export function logOgi(e: OgiLogEvent) {
  const parts = [`ogi ${e.event}`, `page=${e.page}`, `role=${e.role}`];
  if (e.tool) parts.push(`tool=${e.tool}`);
  if (e.outcome) parts.push(`outcome=${e.outcome}`);
  console.info(redact(parts.join(" ")));
}
