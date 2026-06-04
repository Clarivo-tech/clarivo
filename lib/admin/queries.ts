import { createAdminClient } from "@/lib/supabase/admin";

export type AdminSubscriptionRow = {
  id: string;
  organisationId: string;
  organisationName: string;
  ownerUserId: string;
  ownerEmail: string | null;
  licenses: number;
  amountPence: number;
  currency: string;
  status: string;
  revolutSubscriptionId: string | null;
  revolutState: string | null;
  activatedAt: string | null;
  createdAt: string;
};

export type AdminTrialRow = {
  userId: string;
  email: string | null;
  company: string | null;
  organisationId: string | null;
  organisationName: string | null;
  trialStartedAt: string | null;
  trialExpiresAt: string | null;
  plan: string | null;
};

export type AdminUserRow = {
  userId: string;
  email: string | null;
  company: string | null;
  organisationId: string | null;
  organisationName: string | null;
  plan: string | null;
  seatLimit: number | null;
  subscriptionStatus: string | null;
  trialExpiresAt: string | null;
  createdAt: string | null;
};

async function emailForUserId(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  cache: Map<string, string | null>
): Promise<string | null> {
  if (cache.has(userId)) {
    return cache.get(userId) ?? null;
  }

  const { data, error } = await admin.auth.admin.getUserById(userId);
  const email = error ? null : (data.user?.email ?? null);
  cache.set(userId, email);
  return email;
}

export async function fetchAdminSubscriptions(): Promise<AdminSubscriptionRow[]> {
  const admin = createAdminClient();

  const { data: rows, error } = await admin
    .from("billing_subscriptions")
    .select(
      `
      id,
      organisation_id,
      user_id,
      licenses,
      amount_pence,
      currency,
      status,
      revolut_subscription_id,
      revolut_state,
      activated_at,
      created_at,
      organisations ( name )
    `
    )
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[admin] subscriptions:", error.message);
    return [];
  }

  const emailCache = new Map<string, string | null>();

  return Promise.all(
    (rows ?? []).map(async (row) => {
      const org = row.organisations as { name?: string } | null;
      return {
        id: row.id as string,
        organisationId: row.organisation_id as string,
        organisationName: org?.name ?? "—",
        ownerUserId: row.user_id as string,
        ownerEmail: await emailForUserId(
          admin,
          row.user_id as string,
          emailCache
        ),
        licenses: row.licenses as number,
        amountPence: row.amount_pence as number,
        currency: row.currency as string,
        status: row.status as string,
        revolutSubscriptionId: row.revolut_subscription_id as string | null,
        revolutState: row.revolut_state as string | null,
        activatedAt: row.activated_at as string | null,
        createdAt: row.created_at as string,
      };
    })
  );
}

export async function fetchAdminActiveTrials(): Promise<AdminTrialRow[]> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: prefs, error } = await admin
    .from("user_preferences")
    .select(
      `
      user_id,
      company,
      organisation_id,
      trial_started_at,
      trial_expires_at,
      subscription_status,
      organisations ( name, plan )
    `
    )
    .eq("subscription_status", "trial")
    .gt("trial_expires_at", now)
    .order("trial_expires_at", { ascending: true });

  if (error) {
    console.error("[admin] trials:", error.message);
    return [];
  }

  const emailCache = new Map<string, string | null>();

  return Promise.all(
    (prefs ?? []).map(async (row) => {
      const org = row.organisations as { name?: string; plan?: string } | null;
      return {
        userId: row.user_id as string,
        email: await emailForUserId(admin, row.user_id as string, emailCache),
        company: row.company as string | null,
        organisationId: row.organisation_id as string | null,
        organisationName: org?.name ?? null,
        trialStartedAt: row.trial_started_at as string | null,
        trialExpiresAt: row.trial_expires_at as string | null,
        plan: org?.plan ?? null,
      };
    })
  );
}

export async function fetchAdminUsers(): Promise<AdminUserRow[]> {
  const admin = createAdminClient();
  const emailCache = new Map<string, string | null>();
  const users: AdminUserRow[] = [];

  let page = 1;
  const perPage = 200;

  while (true) {
    const { data: list, error } = await admin.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      console.error("[admin] listUsers:", error.message);
      break;
    }

    const authUsers = list.users ?? [];
    if (authUsers.length === 0) break;

    const ids = authUsers.map((u) => u.id);

    const { data: prefsRows } = await admin
      .from("user_preferences")
      .select(
        `
        user_id,
        company,
        organisation_id,
        subscription_status,
        trial_expires_at,
        created_at,
        organisations ( name, plan, seat_limit )
      `
      )
      .in("user_id", ids);

    const prefsByUser = new Map(
      (prefsRows ?? []).map((p) => [p.user_id as string, p])
    );

    for (const authUser of authUsers) {
      const pref = prefsByUser.get(authUser.id);
      const org = pref?.organisations as {
        name?: string;
        plan?: string;
        seat_limit?: number;
      } | null;

      users.push({
        userId: authUser.id,
        email: authUser.email ?? null,
        company: (pref?.company as string | null) ?? null,
        organisationId: (pref?.organisation_id as string | null) ?? null,
        organisationName: org?.name ?? null,
        plan: org?.plan ?? null,
        seatLimit: org?.seat_limit ?? null,
        subscriptionStatus: (pref?.subscription_status as string | null) ?? null,
        trialExpiresAt: (pref?.trial_expires_at as string | null) ?? null,
        createdAt:
          (pref?.created_at as string | null) ??
          authUser.created_at ??
          null,
      });
      emailCache.set(authUser.id, authUser.email ?? null);
    }

    if (authUsers.length < perPage) break;
    page += 1;
  }

  return users.sort((a, b) =>
    (b.createdAt ?? "").localeCompare(a.createdAt ?? "")
  );
}
