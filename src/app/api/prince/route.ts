import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import type { ChatCompletionMessageParam } from "groq-sdk/resources/chat/completions";
import { isDemoUser, requireApiUser } from "@/lib/session";
import { buildSystemPrompt } from "@/lib/prince/systemPrompt";
import { formatContext, retrieve } from "@/lib/prince/retrieval";
import { princeTools, callPrinceTool } from "@/lib/prince/tools";

const MODEL = "openai/gpt-oss-120b";
const MAX_TOOL_ROUNDS = 6;
const MAX_MESSAGES = 20;
const MAX_MESSAGE_CHARS = 1000;
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 10 * 60 * 1000;

// Best-effort per-caller throttle (per server instance): this endpoint is public,
// so it must not be an open tap on the Groq key.
const hits = new Map<string, number[]>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > RATE_LIMIT;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: Request) {
  // Public on purpose: anyone can ask about policy. Only a session unlocks the
  // ledger tools, and those are scoped to that session's own (real or demo) data.
  const user = await requireApiUser();
  const demo = user ? isDemoUser(user) : false;

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (rateLimited(user ? `user:${user.uid}` : `ip:${ip}`)) {
    return NextResponse.json({ error: "Too many questions. Please wait a few minutes." }, { status: 429 });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Prince is not configured (missing GROQ_API_KEY)." }, { status: 500 });
  }

  const { messages } = (await request.json()) as { messages: ChatMessage[] };
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
    return NextResponse.json({ error: "Missing messages" }, { status: 400 });
  }
  if (messages.some((m) => typeof m?.content !== "string" || m.content.length > MAX_MESSAGE_CHARS)) {
    return NextResponse.json({ error: "Message too long" }, { status: 400 });
  }

  // Retrieve on the last two user turns so follow-ups like "and if I'm late?" keep their topic.
  const query = messages
    .filter((m) => m.role === "user")
    .slice(-2)
    .map((m) => m.content)
    .join(" ");
  const context = formatContext(retrieve(query));

  const groq = new Groq({ apiKey });

  const history: ChatCompletionMessageParam[] = [
    { role: "system", content: buildSystemPrompt({ signedIn: Boolean(user), demo, context }) },
    ...messages.map((m): ChatCompletionMessageParam => ({ role: m.role, content: m.content })),
  ];

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      let response;
      try {
        response = await groq.chat.completions.create({
          model: MODEL,
          max_tokens: 1024,
          ...(user ? { tools: princeTools } : {}),
          messages: history,
        });
      } catch (err) {
        // gpt-oss-120b occasionally hallucinates a slightly-misspelled tool
        // name, which Groq rejects at the API level (400, before any message
        // comes back) rather than letting the model see and self-correct.
        // History is unchanged, so just retrying resamples a fresh
        // generation -- bounded by the existing round budget above.
        console.error(`Prince: model call failed on round ${round}, retrying:`, err);
        continue;
      }

      const message = response.choices[0]?.message;
      const toolCalls = message?.tool_calls ?? [];

      if (toolCalls.length === 0) {
        return NextResponse.json({ reply: message?.content ?? "" });
      }

      history.push({
        role: "assistant",
        content: message.content,
        tool_calls: toolCalls,
      });

      const toolResults = await Promise.all(
        toolCalls.map(async (call) => {
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(call.function.arguments);
          } catch {
            // Leave args empty if the model produced malformed JSON.
          }
          const result = user ? await callPrinceTool(call.function.name, args, demo) : { error: "Not signed in" };
          return {
            role: "tool" as const,
            tool_call_id: call.id,
            content: JSON.stringify(result),
          };
        })
      );

      history.push(...toolResults);
    }

    return NextResponse.json({
      reply: "I couldn't settle on an answer after checking the data. Try rephrasing the question.",
    });
  } catch (error) {
    console.error("Prince error:", error);
    return NextResponse.json({ error: "Prince ran into a problem answering that." }, { status: 500 });
  }
}
