import { complete, type Model, type Api } from "@mariozechner/pi-ai";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

const skillPattern = /^\/skill:(\S+)\s*([\s\S]*)/;

const SUMMARY_PROMPT =
  "Summarize the user's request in 5-10 words max. Output ONLY the summary, nothing else. No quotes, no punctuation at the end.";

const CODEX_MODEL_ID = "gpt-5.1-codex-mini";
const HAIKU_MODEL_ID = "claude-haiku-4-5";

async function pickCheapModel(ctx: {
  model: Model<Api> | null;
  modelRegistry: {
    find: (p: string, id: string) => Model<Api> | undefined;
    getApiKey: (m: Model<Api>) => Promise<string | undefined>;
  };
}): Promise<{ model: Model<Api>; apiKey: string } | null> {
  const codex = ctx.modelRegistry.find("openai-codex", CODEX_MODEL_ID);
  if (codex) {
    const key = await ctx.modelRegistry.getApiKey(codex);
    if (key) return { model: codex, apiKey: key };
  }
  const haiku = ctx.modelRegistry.find("anthropic", HAIKU_MODEL_ID);
  if (haiku) {
    const key = await ctx.modelRegistry.getApiKey(haiku);
    if (key) return { model: haiku, apiKey: key };
  }
  if (ctx.model) {
    const key = await ctx.modelRegistry.getApiKey(ctx.model);
    if (key) return { model: ctx.model, apiKey: key };
  }
  return null;
}

export default function (pi: ExtensionAPI) {
  let named = false;

  pi.on("session_start", () => {
    named = !!pi.getSessionName();
  });

  pi.on("input", async (event, ctx) => {
    if (named) return;

    const match = event.text.match(skillPattern);
    if (!match) return;

    const skillName = match[1];
    const userPrompt = match[2].trim();
    named = true;

    if (!userPrompt) {
      pi.setSessionName(`[${skillName}]`);
      return;
    }

    // Set a temporary name immediately so something shows up
    pi.setSessionName(`[${skillName}] ${userPrompt.slice(0, 60)}`);

    // Summarize in the background with a cheap model
    const cheap = await pickCheapModel(ctx);
    if (!cheap) return;

    try {
      const response = await complete(
        cheap.model,
        {
          systemPrompt: SUMMARY_PROMPT,
          messages: [{ role: "user", content: [{ type: "text", text: userPrompt }], timestamp: Date.now() }],
        },
        { apiKey: cheap.apiKey },
      );

      const summary = response.content
        .filter((c): c is { type: "text"; text: string } => c.type === "text")
        .map((c) => c.text)
        .join("")
        .trim();

      if (summary) {
        pi.setSessionName(`[${skillName}] ${summary}`);
      }
    } catch {
      // Keep the truncated name, no big deal
    }
  });
}
