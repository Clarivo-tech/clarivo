const MODEL = "claude-sonnet-4-5";
const CLAUDE_TIMEOUT_MS = 50_000;

export const CLAUDE_SYSTEM_PROMPT = `You are a contract intelligence assistant. Analyze the attached PDF contract and extract structured data.

Return JSON only — no markdown, no code fences, no explanation. Use this exact shape:
{
  "vendor_name": string | null,
  "contract_value": number | null,
  "currency": string | null,
  "start_date": "YYYY-MM-DD" | null,
  "end_date": "YYYY-MM-DD" | null,
  "renewal_date": "YYYY-MM-DD" | null,
  "notice_period_days": number | null,
  "auto_renews": boolean | null,
  "contract_type": string | null,
  "summary": string | null
}

Rules:
- contract_value must be a number without currency symbols.
- currency should be ISO 4217 when possible (USD, GBP, EUR).
- Dates must be ISO YYYY-MM-DD or null.
- notice_period_days is cancellation/renewal notice in days, or null.
- auto_renews is true only if the contract explicitly auto-renews.
- contract_type is a short label (e.g. SaaS, MSA, NDA, Lease).
- summary is one or two sentences.`;

export type ExtractedFields = {
  vendor_name: string | null;
  contract_value: number | null;
  currency: string | null;
  start_date: string | null;
  end_date: string | null;
  renewal_date: string | null;
  notice_period_days: number | null;
  auto_renews: boolean | null;
  contract_type: string | null;
  summary: string | null;
};

/** Pull readable strings from PDF literal text (best-effort, no extra deps). */
export function extractSimplePdfText(buffer: Buffer): string {
  const raw = buffer.toString("latin1");
  const parts: string[] = [];

  const literalMatches = raw.match(/\((?:\\.|[^\\)])*?\)/g) ?? [];
  for (const match of literalMatches) {
    const inner = match
      .slice(1, -1)
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "")
      .replace(/\\\(/g, "(")
      .replace(/\\\)/g, ")");
    if (inner.length > 2 && /[a-zA-Z]{2}/.test(inner)) {
      parts.push(inner);
    }
  }

  const streamText = raw
    .replace(/[^\x20-\x7E\n]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const combined = [...parts, streamText.slice(0, 2000)].join(" ").trim();
  return combined.slice(0, 8000);
}

export function parseExtractedJson(text: string): ExtractedFields {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const parsed: unknown = JSON.parse(cleaned);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Claude response was not a JSON object.");
  }

  const data = parsed as Record<string, unknown>;

  return {
    vendor_name: asString(data.vendor_name),
    contract_value: asNumber(data.contract_value),
    currency: asString(data.currency),
    start_date: asDate(data.start_date),
    end_date: asDate(data.end_date),
    renewal_date: asDate(data.renewal_date),
    notice_period_days: asInteger(data.notice_period_days),
    auto_renews: asBoolean(data.auto_renews ?? data.auto_renewal),
    contract_type: asString(data.contract_type),
    summary: asString(data.summary),
  };
}

function asString(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s.length > 0 ? s : null;
}

function asNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function asInteger(value: unknown): number | null {
  const n = asNumber(value);
  return n == null ? null : Math.round(n);
}

function asBoolean(value: unknown): boolean | null {
  if (value == null) return null;
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

function asDate(value: unknown): string | null {
  const s = asString(value);
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

export function deriveDataStatus(
  endDate: string | null,
  renewalDate: string | null
): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (endDate) {
    const end = new Date(endDate);
    if (end < today) return "expired";
  }

  if (renewalDate) {
    const renewal = new Date(renewalDate);
    const in30 = new Date(today);
    in30.setDate(in30.getDate() + 30);
    if (renewal >= today && renewal <= in30) return "expiring";
  }

  return "active";
}

export async function callClaudeWithPdf(pdfBase64: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured.");
  }

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
        max_tokens: 1024,
        system: CLAUDE_SYSTEM_PROMPT,
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
                text: "Extract contract data from this PDF and return JSON only.",
              },
            ],
          },
        ],
      }),
    });

    const raw = await response.text();
    let data: {
      content?: Array<{ type: string; text?: string }>;
      error?: { message: string };
    };

    try {
      data = JSON.parse(raw) as typeof data;
    } catch {
      throw new Error(
        `Claude returned invalid JSON (HTTP ${response.status}).`
      );
    }

    if (!response.ok) {
      throw new Error(
        data.error?.message ?? `Claude API error (HTTP ${response.status}).`
      );
    }

    const text = data.content
      ?.filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("");

    if (!text?.trim()) {
      throw new Error("Claude returned empty text.");
    }

    return text;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Claude request timed out.");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
