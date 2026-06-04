import { createAdminClient } from "../lib/supabase/admin";
import { fulfillBillingPayment } from "../lib/billing/fulfill-payment";

async function main() {
  const admin = createAdminClient();

  const { data: payments, error } = await admin
    .from("billing_payments")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  if (!payments?.length) {
    console.log("No pending billing payments.");
    return;
  }

  for (const payment of payments) {
    console.log(`Syncing ${payment.merchant_reference} (${payment.licenses} licenses)…`);
    const result = await fulfillBillingPayment(admin, payment);
    if (result.error) {
      console.error("  Error:", result.error);
    } else if (result.fulfilled) {
      console.log("  Activated.");
    } else {
      console.log("  Not paid yet in Revolut.");
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
