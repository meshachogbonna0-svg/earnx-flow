import { GoogleGenAI } from "@google/genai";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const requestSchema = z.object({
  message: z.string().trim().min(1, "Message is required").max(2000, "Message is too long"),
});

const SYSTEM_INSTRUCTION = `You are EarnX AI Assistant, a polite general support assistant for EarnX Finance.

Use only general EarnX feature information that is present in the user's question or the following safe product context: EarnX is an earning platform with account activation, earning activities, levels, referrals, withdrawals, support, and an authenticated dashboard. Do not invent prices, balances, transaction statuses, approvals, payment details, rewards, or account information. You do not have access to PostgreSQL, user accounts, or private platform records yet. Say clearly when you do not know. Do not perform financial transactions or claim to approve, reject, or change anything. Keep answers clear, helpful, and concise.`;

export const Route = createFileRoute("/api/ai/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body: unknown = await request.json();
          const parsed = requestSchema.safeParse(body);
          if (!parsed.success) {
            return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid message" }, { status: 400 });
          }

          const apiKey = process.env.GEMINI_API_KEY;
          if (!apiKey) {
            console.error("[AI] GEMINI_API_KEY is not configured");
            return Response.json({ error: "The AI assistant is not configured yet." }, { status: 503 });
          }

          const ai = new GoogleGenAI({ apiKey });
          const response = await ai.models.generateContent({
            model: process.env.GEMINI_MODEL || "gemini-2.5-flash-lite",
            contents: parsed.data.message,
            config: {
              systemInstruction: SYSTEM_INSTRUCTION,
              temperature: 0.3,
              maxOutputTokens: 500,
            },
          });

          const text = response.text?.trim();
          if (!text) {
            return Response.json({ error: "Gemini returned an empty response." }, { status: 502 });
          }

          return Response.json({ reply: text });
        } catch (error) {
          console.error("[AI] Gemini request failed", error);
          return Response.json(
            { error: "I’m having trouble connecting right now. Please try again shortly." },
            { status: 502 },
          );
        }
      },
    },
  },
});
