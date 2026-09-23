export async function requestAssistantResponse(message: string): Promise<string> {
  const response = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message }),
  });

  const payload = (await response.json().catch(() => null)) as { reply?: string; error?: string } | null;
  if (!response.ok) {
    throw new Error(payload?.error || "The AI assistant is temporarily unavailable.");
  }
  if (!payload?.reply) throw new Error("The AI assistant returned no response.");
  return payload.reply;
}
