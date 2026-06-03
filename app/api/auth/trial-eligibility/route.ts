import { NextResponse } from "next/server";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { getTrialEligibilityForEmail } from "@/lib/trial/eligibility";

export async function POST(request: Request) {
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = body.email?.trim();
  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const admin = tryCreateAdminClient();
  if (!admin) {
    console.warn("[trial-eligibility] service role not configured");
    return NextResponse.json({ eligible: true });
  }

  const result = await getTrialEligibilityForEmail(admin, email);
  return NextResponse.json(result);
}
