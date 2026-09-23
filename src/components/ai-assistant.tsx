import { useEffect, useRef, useState } from "react";
import { Bot, MessageCircle, Minus, Send, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { temporaryAssistantResponse } from "@/lib/ai-assistant";

type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
};

const QUICK_QUESTIONS = [
  "How does EarnX work?",
  "How do I activate my account?",
  "How do I withdraw?",
  "What are the EarnX levels?",
  "Contact support",
];

const WELCOME_MESSAGE: ChatMessage = {
  id: 0,
  role: "assistant",
  content: "Hi! I’m EarnX AI Assistant. Choose a quick question or ask me anything about your EarnX experience.",
};

export function AiAssistant() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const sendMessage = (value = draft) => {
    const content = value.trim();
    if (!content || typing) return;

    const userMessage: ChatMessage = { id: nextId.current++, role: "user", content };
    setMessages((current) => (current.length === 0 ? [WELCOME_MESSAGE, userMessage] : [...current, userMessage]));
    setDraft("");
    setTyping(true);

    // This is the only communication seam. Replace it with a secure backend call later.
    void temporaryAssistantResponse(content).then((reply) => {
      setMessages((current) => [...current, { id: nextId.current++, role: "assistant", content: reply }]);
      setTyping(false);
    });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    sendMessage();
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 pointer-events-none sm:inset-x-auto sm:bottom-6 sm:right-6">
      {open && (
        <section
          aria-label="EarnX AI Assistant chat"
          className="pointer-events-auto mx-3 mb-3 flex h-[min(72vh,560px)] flex-col overflow-hidden rounded-3xl border border-gold/30 bg-navy-deep shadow-2xl shadow-black/50 animate-scale-in sm:mx-0 sm:mb-4 sm:w-[min( calc(100vw-2rem),390px)]"
        >
          <header className="flex shrink-0 items-center gap-3 border-b border-border bg-gradient-to-r from-navy via-card to-navy-deep px-4 py-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-gold/40 bg-gold/10 text-gold shadow-gold-glow">
              <Bot className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-bold">EarnX AI Assistant</h2>
              <p className="truncate text-[10px] text-muted-foreground">How can I help you today?</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Minimize EarnX AI Assistant"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-muted-foreground transition hover:bg-secondary hover:text-foreground active:scale-95"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close EarnX AI Assistant"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-muted-foreground transition hover:bg-secondary hover:text-foreground active:scale-95"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-4" aria-live="polite">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col justify-center">
                <div className="mb-5 text-center">
                  <span className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-success/30 bg-success/10 text-success">
                    <Sparkles className="h-5 w-5" />
                  </span>
                  <p className="mt-3 text-xs font-semibold">What would you like to know?</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">Try one of these popular questions.</p>
                </div>
                <div className="space-y-2">
                  {QUICK_QUESTIONS.map((question) => (
                    <button
                      key={question}
                      type="button"
                      onClick={() => sendMessage(question)}
                      className="w-full rounded-2xl border border-gold/20 bg-card/70 px-3 py-2.5 text-left text-[11px] font-medium text-foreground transition hover:border-gold/50 hover:bg-gold/10 active:scale-[0.99]"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((message) => (
                  <div key={message.id} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed",
                        message.role === "user"
                          ? "rounded-br-md bg-gold-gradient font-medium text-gold-foreground"
                          : "rounded-bl-md border border-border bg-card text-foreground",
                      )}
                    >
                      {message.content}
                    </div>
                  </div>
                ))}
                {typing && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-border bg-card px-4 py-3" aria-label="Assistant is typing">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-success [animation-delay:-0.2s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-success [animation-delay:-0.1s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-success" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="flex shrink-0 gap-2 border-t border-border bg-card/60 p-3">
            <label htmlFor="earnx-ai-message" className="sr-only">Message EarnX AI Assistant</label>
            <input
              id="earnx-ai-message"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask EarnX AI anything..."
              disabled={typing}
              className="min-w-0 flex-1 rounded-xl border border-input bg-background/70 px-3 py-2.5 text-xs outline-none transition placeholder:text-muted-foreground focus:border-gold focus:ring-2 focus:ring-gold/20 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!draft.trim() || typing}
              aria-label="Send message"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold-gradient text-gold-foreground transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </section>
      )}

      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open EarnX AI Assistant"
          className="pointer-events-auto mb-24 ml-auto mr-4 flex items-center gap-2 rounded-full border border-gold/50 bg-gradient-to-r from-navy-deep to-royal px-4 py-3 text-xs font-bold text-gold shadow-gold-glow transition hover:brightness-110 active:scale-95 sm:mb-0 sm:mr-0"
        >
          <span className="grid h-7 w-7 place-items-center rounded-full bg-gold/15"><MessageCircle className="h-4 w-4" /></span>
          AI Assistant
        </button>
      )}
    </div>
  );
}
