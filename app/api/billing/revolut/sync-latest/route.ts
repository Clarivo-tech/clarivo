import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/auth";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { fulfillBillingPayment } from "@/lib/billing/fulfill-payment";
import { getOrgContextForTeam } from "@/lib/team/org";

export async function POST() {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is not configured." },
      { status: 500 }
    );
  }

  const auth = await requireUser();
  if (!auth.user) return auth.response;

  const context = await getOrgContextForTeam(auth.supabase, auth.user.id);
  if (!context || context.role !== "owner") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: payment, error } = await admin
    .from("billing_payments")
    .select("*")
    .eq("organisation_id", context.organisationId)
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!payment) {
    return NextResponse.json({ status: "none" });
  }

  if (payment.status === "completed") {
    return NextResponse.json({ status: "completed", licenses: payment.licenses });
  }

  const result = await fulfillBillingPayment(admin, payment, {
    ownerEmail: auth.user.email,
  });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    status: result.fulfilled ? "completed" : payment.status,
    licenses: payment.licenses,
  });
}
