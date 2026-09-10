import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import type { ChatCompletionMessageParam } from "groq-sdk/resources/chat/completions";
import { requireApiUser } from "@/lib/session";
import { PRINCE_SYSTEM_PROMPT } from "@/lib/prince/systemPrompt";
import { princeTools, callPrinceTool } from "@/lib/prince/tools";

const MODEL = "openai/gpt-oss-120b";
const MAX_TOOL_ROUNDS = 6;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Prince is not configured (missing GROQ_API_KEY)." }, { status: 500 });
  }

  const { messages } = (await request.json()) as { messages: ChatMessage[] };
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "Missing messages" }, { status: 400 });
  }

  const groq = new Groq({ apiKey });

  const history: ChatCompletionMessageParam[] = [
    { role: "system", content: PRINCE_SYSTEM_PROMPT },
    ...messages.map((m): ChatCompletionMessageParam => ({ role: m.role, content: m.content })),
  ];

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      let response;
      try {
        response = await groq.chat.completions.create({
          model: MODEL,
          max_tokens: 1024,
          tools: princeTools,
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
          const result = await callPrinceTool(call.function.name, args);
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
