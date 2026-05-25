import { EXTRACTION_PROMPT } from "@/lib/extraction/prompt";

const MODEL = "claude-sonnet-4-5";
const CLAUDE_TIMEOUT_MS = 50_000;

type AnthropicMessageResponse = {
  content?: Array<{ type: string; text?: string }>;
  error?: { type: string; message: string };
};

/**
 * Sends a PDF to Claude as a base64 document content block (Anthropic Messages API).
 */
export async function extractContractWithClaude(
  pdfBase64: string
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured.");
  }

  console.log("[extract] Claude request start", {
    model: MODEL,
    pdfBase64Length: pdfBase64.length,
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CLAUDE_TIMEOUT_MS);

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: pdfBase64,
                },
              },
              {
                type: "text",
                text: EXTRACTION_PROMPT,
              },
            ],
          },
        ],
      }),
    });

    const raw = await response.text();
    let data: AnthropicMessageResponse;

    try {
      data = JSON.parse(raw) as AnthropicMessageResponse;
    } catch {
      console.error("[extract] Claude non-JSON response", {
        status: response.status,
        bodyPreview: raw.slice(0, 500),
      });
      throw new Error(`Claude API returned invalid JSON (${response.status}).`);
    }

    if (!response.ok) {
      console.error("[extract] Claude API error", {
        status: response.status,
        error: data.error,
        bodyPreview: raw.slice(0, 500),
      });
      throw new Error(
        data.error?.message ??
          `Claude API error (${response.status}).`
      );
    }

    const text = data.content
      ?.filter((block) => block.type === "text")
      .map((block) => block.text ?? "")
      .join("");

    if (!text?.trim()) {
      throw new Error("Claude returned an empty response.");
    }

    console.log("[extract] Claude response ok", {
      textLength: text.length,
    });

    return text;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      console.error("[extract] Claude request timed out", {
        timeoutMs: CLAUDE_TIMEOUT_MS,
      });
      throw new Error("Claude request timed out. Try a smaller PDF.");
    }
    console.error("[extract] Claude request failed", err);
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
