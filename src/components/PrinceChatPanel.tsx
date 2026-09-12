"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { CloseIcon, SendIcon, SparkleIcon } from "@/components/icons";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "How much have we made so far?",
  "Who's in the grace zone?",
  "List bikes flagged for repossession",
];

export function PrinceChatPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/prince", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Something went wrong");
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "I couldn't reach the ledger just now. Try again in a moment." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/35" onClick={onClose} />

      <div className="relative w-full sm:max-w-[420px] h-dvh bg-bg shadow-2xl flex flex-col border-border sm:border-l">
        <div className="bg-brand px-5 py-4.5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-[38px] h-[38px] rounded-full bg-white/[0.16] border border-white/40 flex items-center justify-center text-cream">
              <SparkleIcon size={19} />
            </div>
            <div>
              <div className="text-cream text-[15px] font-extrabold">Prince</div>
              <div className="text-cream/75 text-[11.5px] font-semibold">Your business assistant</div>
            </div>
          </div>
          <button onClick={onClose} className="text-cream cursor-pointer" aria-label="Close">
            <CloseIcon size={18} />
          </button>
        </div>

        <div className="bg-status-grace-bg text-status-grace-fg text-[11.5px] font-bold px-5 py-2.5 flex-shrink-0">
          Every answer is pulled live from your bike records — Prince won&apos;t guess a number.
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4.5 py-4 flex flex-col gap-3.5">
          {messages.length === 0 && (
            <div className="flex flex-col gap-2 mt-2">
              <div className="text-[12.5px] font-bold text-muted mb-1">Try asking:</div>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-left text-[13.5px] font-semibold bg-white border border-border rounded-xl px-3.5 py-2.5 hover:border-[#d8d3c4] cursor-pointer"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {messages.map((m, i) => (
            <div
              key={i}
              className={
                m.role === "user"
                  ? "self-end max-w-[82%] bg-brand text-cream px-3.5 py-2.5 rounded-[14px] rounded-br-[3px] text-[13.5px] font-semibold leading-snug"
                  : "self-start max-w-[88%] bg-white border border-border px-3.5 py-2.5 rounded-[14px] rounded-bl-[3px] text-[13.5px] font-semibold leading-relaxed whitespace-pre-wrap"
              }
            >
              {m.content}
            </div>
          ))}

          {loading && (
            <div className="self-start max-w-[88%] bg-white border border-border px-3.5 py-2.5 rounded-[14px] rounded-bl-[3px] text-[13.5px] font-semibold text-muted">
              Checking the ledger…
            </div>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="px-4 py-3.5 border-t border-border flex items-center gap-2.5 bg-white flex-shrink-0"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Prince anything about your bikes…"
            className="flex-1 text-[13.5px] font-semibold px-3.5 py-2.5 border border-border-input rounded-full bg-bg text-ink focus:outline-none focus:border-[#1f6b45]"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="w-[38px] h-[38px] rounded-full bg-brand flex items-center justify-center text-cream flex-shrink-0 disabled:opacity-50 cursor-pointer"
            aria-label="Send"
          >
            <SendIcon size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
