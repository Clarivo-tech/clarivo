import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/auth";
import { syncLatestPendingPaymentForUser } from "@/lib/billing/sync-pending-payment";
import { getOrgContextForTeam } from "@/lib/team/org";

export async function POST() {
  const auth = await requireUser();
  if (!auth.user) return auth.response;

  const context = await getOrgContextForTeam(auth.supabase, auth.user.id);
  if (!context || context.role !== "owner") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const result = await syncLatestPendingPaymentForUser(
    auth.user.id,
    context.organisationId,
    auth.user.email,
    auth.supabase
  );

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  const refreshed = await getOrgContextForTeam(auth.supabase, auth.user.id);
  const seatLimit = refreshed?.seatLimit ?? context.seatLimit;

  const { data: payment } = await auth.supabase
    .from("billing_payments")
    .select("status")
    .eq("organisation_id", context.organisationId)
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const completed =
    result.fulfilled ||
    payment?.status === "completed" ||
    (refreshed?.plan ?? "").toLowerCase() === "pro";

  return NextResponse.json({
    status: completed ? "completed" : payment?.status ?? "pending",
    licenses: seatLimit,
  });
}
