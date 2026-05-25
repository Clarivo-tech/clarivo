import type { ExtractedContract } from "@/lib/extraction/types";

export function parseExtractedJson(text: string): ExtractedContract {
  const trimmed = text.trim();
  const withoutFences = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const parsed: unknown = JSON.parse(withoutFences);

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Extraction response was not a JSON object.");
  }

  const data = parsed as Record<string, unknown>;

  return {
    vendor_name: asNullableString(data.vendor_name),
    contract_value: asNullableNumber(data.contract_value),
    currency: asNullableString(data.currency),
    start_date: asNullableDateString(data.start_date),
    end_date: asNullableDateString(data.end_date),
    renewal_date: asNullableDateString(data.renewal_date),
    notice_period_days: asNullableInteger(data.notice_period_days),
    auto_renews: asNullableBoolean(data.auto_renews),
    contract_type: asNullableString(data.contract_type),
    summary: asNullableString(data.summary),
  };
}

function asNullableString(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s.length > 0 ? s : null;
}

function asNullableNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function asNullableInteger(value: unknown): number | null {
  const n = asNullableNumber(value);
  if (n == null) return null;
  return Math.round(n);
}

function asNullableBoolean(value: unknown): boolean | null {
  if (value == null) return null;
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

function asNullableDateString(value: unknown): string | null {
  const s = asNullableString(value);
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}
