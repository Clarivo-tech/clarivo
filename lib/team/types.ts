/** Roles used in the app — invites always create members. */
export type OrganisationRole = "owner" | "member";

export type InviteRole = "member";

/** Legacy values still stored on some organisation_members rows. */
export type StoredOrganisationRole = OrganisationRole | "admin" | "viewer";

export type OrgContext = {
  organisationId: string;
  organisationName: string;
  plan: string;
  seatLimit: number;
  role: OrganisationRole;
  allowedEmailDomain: string | null;
  isSubscribed: boolean;
};

export type TeamMemberRow = {
  id: string;
  userId: string | null;
  email: string;
  firstName: string;
  lastName: string;
  role: StoredOrganisationRole;
  status: string;
  joinedAt: string;
};

export type TeamInvite = {
  id: string;
  email: string;
  role: InviteRole;
  status: string;
  created_at: string;
  expires_at: string;
};

export type TeamPageLicenseInfo = {
  purchased: number;
  utilized: number;
  available: number;
  allowedEmailDomain: string | null;
  isSubscribed: boolean;
};

export type OrganisationMember = {
  id: string;
  organisation_id: string;
  user_id: string | null;
  role: StoredOrganisationRole;
  invited_email: string | null;
  status: string;
  joined_at: string;
};
