/**
 * Frontend-only placeholder for the assistant transport.
 *
 * Keep this function as the single boundary between the chat UI and future
 * assistant infrastructure. Later it can call a secure backend endpoint;
 * browser code must never contain an AI provider key.
 */
export async function temporaryAssistantResponse(_message: string): Promise<string> {
  await new Promise((resolve) => window.setTimeout(resolve, 700));
  return "Thanks for your message. EarnX AI Assistant is being connected. Please try again shortly.";
}
