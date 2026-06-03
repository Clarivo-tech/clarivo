import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/auth";
import { setupOrganisationForUser } from "@/lib/team/setup-organisation";

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;

  let body: { company?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const company =
    body.company?.trim() ||
    (auth.user.user_metadata?.company as string | undefined)?.trim() ||
    "My";

  const result = await setupOrganisationForUser(
    auth.user.id,
    company,
    auth.supabase,
    auth.user.email
  );

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    organisationId: result.organisationId,
  });
}
