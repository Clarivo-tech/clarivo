import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/auth";
import { buildContractContextPrompt } from "@/lib/chat/build-contract-context";
import { computeContractHealthRows } from "@/lib/contracts/health-score-rows";
import { HEALTH_SCORE_CRITERIA } from "@/lib/contracts/health-score";
import type { ContractData } from "@/lib/types/contracts";

export const maxDuration = 60;

const MODEL = "claude-sonnet-4-5";

const SUGGESTIONS_INSTRUCTION = `You are Clarivo's contract health advisor. Using the contract data and health score breakdown provided, produce actionable suggestions to IMPROVE contract health scores across the portfolio.

Scoring rules (for reference):
${HEALTH_SCORE_CRITERIA.map((c) => `- ${c.title} (${c.points}): ${c.description}`).join("\n")}

Focus suggestions on:
- Negotiating longer notice periods (60+ days avoids auto-renewal penalty)
- Securing exit / termination for convenience clauses
- Addressing auto-renewal risk before deadlines
- Contracts with the lowest scores first

Rules:
- Name specific vendors from the health breakdown
- Be practical (legal/commercial actions, not generic advice)
- Do not invent contract facts
- Each suggestion is one clear sentence, under 200 characters when possible

Respond with ONLY valid JSON: an array of 4-6 strings, no markdown.`;

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;

  let body: { contractData?: ContractData[] };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const contractData = Array.isArray(body.contractData) ? body.contractData : [];

  if (contractData.length === 0) {
    return NextResponse.json({
      suggestions: [
        "Upload contracts with extracted terms to receive tailored health improvement suggestions.",
      ],
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured." },
      { status: 500 }
    );
  }

  const healthRows = computeContractHealthRows(contractData);
  const healthSummary = healthRows
    .map(
      (r) =>
        `${r.vendorName}: score ${r.score}/10` +
        (r.deductions.length
          ? ` — deductions: ${r.deductions.join("; ")}`
          : " — no deductions")
    )
    .join("\n");

  try {
    const system = `${buildContractContextPrompt(contractData)}\n\nContract health breakdown:\n${healthSummary}\n\n${SUGGESTIONS_INSTRUCTION}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system,
        messages: [
          {
            role: "user",
            content: "Generate the health improvement suggestions JSON array now.",
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
      return NextResponse.json(
        { error: "Claude returned an invalid response." },
        { status: 500 }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error?.message ?? "Claude API error." },
        { status: 500 }
      );
    }

    const rawText = data.content
      ?.filter((block) => block.type === "text")
      .map((block) => block.text ?? "")
      .join("")
      .trim();

    if (!rawText) {
      return NextResponse.json(
        { error: "Claude returned an empty response." },
        { status: 500 }
      );
    }

    const text = rawText.replace(/```json|```/g, "").trim();

    let suggestions: string[];
    try {
      const parsed = JSON.parse(text) as unknown;
      if (Array.isArray(parsed)) {
        suggestions = parsed
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter(Boolean);
      } else {
        throw new Error("Not an array");
      }
    } catch {
      suggestions = text
        .split(/\n+/)
        .map((line) => line.replace(/^[-*•\d.]+\s*/, "").trim())
        .filter(Boolean);
    }

    if (suggestions.length === 0) {
      return NextResponse.json(
        { error: "Could not parse suggestions from Claude." },
        { status: 500 }
      );
    }

    return NextResponse.json({ suggestions: suggestions.slice(0, 6) });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Suggestions request failed.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
