export const TRIAL_EXPIRED_MESSAGE =
  "Your trial period has expired, please sign up for full access";

export const TRIAL_DURATION_DAYS = 5;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function trialExpiresAtFromStart(start: Date = new Date()): Date {
  const expiry = new Date(start);
  expiry.setDate(expiry.getDate() + TRIAL_DURATION_DAYS);
  return expiry;
}

export function trialExpiryMsFromTimestamp(timestampMs: number): number {
  return timestampMs + TRIAL_DURATION_DAYS * MS_PER_DAY;
}
