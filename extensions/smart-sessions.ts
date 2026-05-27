import { complete, type Model, type Api } from "@earendil-works/pi-ai";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const skillPattern = /^\/skill:(\S+)\s*([\s\S]*)/;

const SUMMARY_PROMPT =
  "Summarize the user's request in 5-10 words max. Output ONLY the summary, nothing else. No quotes, no punctuation at the end.";

const HAIKU_MODEL_ID = "claude-haiku-4-5";

async function pickCheapModel(ctx: {
  model: Model<Api> | null;
  modelRegistry: {
    find: (p: string, id: string) => Model<Api> | undefined;
    getApiKeyAndHeaders: (m: Model<Api>) => Promise<{ ok: true; apiKey?: string; headers?: Record<string, string> } | { ok: false; error: string }>;
  };
}): Promise<{ model: Model<Api>; apiKey: string; headers?: Record<string, string> } | null> {
  const resolveAuth = async (model: Model<Api>) => {
    const auth = await ctx.modelRegistry.getApiKeyAndHeaders(model);
    if (!auth.ok || !auth.apiKey) return null;
    return { model, apiKey: auth.apiKey, headers: auth.headers };
  };

  const haiku = ctx.modelRegistry.find("anthropic", HAIKU_MODEL_ID);
  if (haiku) {
    const auth = await resolveAuth(haiku);
    if (auth) return auth;
  }
  if (ctx.model) {
    const auth = await resolveAuth(ctx.model);
    if (auth) return auth;
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
    void (async () => {
      try {
        const cheap = await pickCheapModel(ctx);
        if (!cheap) return;

        const response = await complete(
          cheap.model,
          {
            systemPrompt: SUMMARY_PROMPT,
            messages: [{ role: "user", content: [{ type: "text", text: userPrompt }], timestamp: Date.now() }],
          },
          { apiKey: cheap.apiKey, headers: cheap.headers },
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
    })();
  });
}
