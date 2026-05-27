import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/auth";
import { buildContractContextPrompt } from "@/lib/chat/build-contract-context";
import type { ContractData } from "@/lib/types/contracts";

export const maxDuration = 60;

const MODEL = "claude-sonnet-4-5";

const INSIGHTS_INSTRUCTION = `You are Clarivo's portfolio analytics engine. Using ONLY the contract data provided, produce exactly 4 or 5 concise, actionable insights about the user's contract portfolio.

Focus on:
- Highest-risk renewals and notice deadlines
- Auto-renewing contracts without exit clauses
- Spend concentration by vendor or type
- Upcoming renewals and gaps in the data

Rules:
- Use specific vendor names, amounts, and dates from the data
- Reference currency amounts as stored in the data (note currencies when mixed)
- Do not invent contracts or facts
- Each insight should be one sentence, under 160 characters when possible

Respond with ONLY valid JSON: an array of 4-5 strings, no markdown, no preamble.
Example: ["Insight one.", "Insight two."]`;

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
      insights: [
        "Upload contracts with extracted data to unlock AI portfolio insights.",
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

  try {
    const system = `${buildContractContextPrompt(contractData)}\n\n${INSIGHTS_INSTRUCTION}`;

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
            content: "Generate the portfolio insights JSON array now.",
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

    let insights: string[];
    try {
      const parsed = JSON.parse(text) as unknown;
      if (Array.isArray(parsed)) {
        insights = parsed
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter(Boolean);
      } else {
        throw new Error("Not an array");
      }
    } catch {
      insights = text
        .split(/\n+/)
        .map((line) => line.replace(/^[-*•\d.]+\s*/, "").trim())
        .filter(Boolean);
    }

    if (insights.length === 0) {
      return NextResponse.json(
        { error: "Could not parse insights from Claude." },
        { status: 500 }
      );
    }

    return NextResponse.json({ insights: insights.slice(0, 5) });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Insights request failed.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
