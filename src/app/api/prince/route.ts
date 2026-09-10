import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireApiUser } from "@/lib/session";
import { PRINCE_SYSTEM_PROMPT } from "@/lib/prince/systemPrompt";
import { princeTools, callPrinceTool } from "@/lib/prince/tools";

const MODEL = "claude-sonnet-5";
const MAX_TOOL_ROUNDS = 6;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Prince is not configured (missing ANTHROPIC_API_KEY)." }, { status: 500 });
  }

  const { messages } = (await request.json()) as { messages: ChatMessage[] };
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "Missing messages" }, { status: 400 });
  }

  const anthropic = new Anthropic({ apiKey });

  const history: Anthropic.MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system: PRINCE_SYSTEM_PROMPT,
        tools: princeTools,
        messages: history,
      });

      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
      );

      if (toolUseBlocks.length === 0) {
        const textBlock = response.content.find(
          (block): block is Anthropic.TextBlock => block.type === "text"
        );
        return NextResponse.json({ reply: textBlock?.text ?? "" });
      }

      history.push({ role: "assistant", content: response.content });

      const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
        toolUseBlocks.map(async (block) => {
          const result = await callPrinceTool(
            block.name,
            block.input as Record<string, unknown>
          );
          return {
            type: "tool_result" as const,
            tool_use_id: block.id,
            content: JSON.stringify(result),
          };
        })
      );

      history.push({ role: "user", content: toolResults });
    }

    return NextResponse.json({
      reply: "I couldn't settle on an answer after checking the data. Try rephrasing the question.",
    });
  } catch (error) {
    console.error("Prince error:", error);
    return NextResponse.json({ error: "Prince ran into a problem answering that." }, { status: 500 });
  }
}
