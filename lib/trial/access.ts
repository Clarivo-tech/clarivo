export type TrialPrefs = {
  subscription_status: string | null;
  trial_expires_at: string | null;
  trial_started_at?: string | null;
  trial_used?: boolean | null;
};

export function isAwaitingPayment(prefs: TrialPrefs): boolean {
  const status = (prefs.subscription_status ?? "").toLowerCase();
  return status === "pending_payment" || status === "expired";
}

export function isTrialExpired(prefs: TrialPrefs, now = Date.now()): boolean {
  const status = (prefs.subscription_status ?? "trial").toLowerCase();
  if (status === "active") return false;
  if (isAwaitingPayment(prefs)) return true;

  const expiresAt = prefs.trial_expires_at
    ? new Date(prefs.trial_expires_at).getTime()
    : null;
  if (expiresAt == null) return false;

  return expiresAt < now;
}

export function isAccountLocked(prefs: TrialPrefs, now = Date.now()): boolean {
  const status = (prefs.subscription_status ?? "").toLowerCase();
  if (status === "active") return false;
  if (isAwaitingPayment(prefs)) return true;
  if (status === "trial") {
    return isTrialExpired(prefs, now);
  }

  // Legacy fallback: if status is missing/unknown and the trial was used,
  // treat the account as locked until activated.
  if (prefs.trial_used === true) return true;

  return isTrialExpired(prefs, now);
}
