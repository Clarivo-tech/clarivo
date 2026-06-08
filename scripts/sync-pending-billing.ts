import { createAdminClient } from "../lib/supabase/admin";
import { fulfillBillingSubscription } from "../lib/billing/fulfill-subscription";

async function main() {
  const admin = createAdminClient();

  const { data: subscriptions, error } = await admin
    .from("billing_subscriptions")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  if (!subscriptions?.length) {
    console.log("No pending billing subscriptions.");
    return;
  }

  for (const subscription of subscriptions) {
    console.log(
      `Syncing ${subscription.merchant_reference} (${subscription.licenses} licenses)…`
    );
    const result = await fulfillBillingSubscription(admin, subscription);
    if (result.error) {
      console.error("  Error:", result.error);
    } else if (result.fulfilled) {
      console.log("  Activated.");
    } else {
      console.log("  Not paid yet in Stripe.");
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
