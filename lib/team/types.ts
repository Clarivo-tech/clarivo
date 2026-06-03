export type OrganisationRole = "owner" | "admin" | "member" | "viewer";

export type InviteRole = "admin" | "member" | "viewer";

export type Organisation = {
  id: string;
  name: string;
  owner_id: string | null;
  plan: string;
  seat_limit: number;
  created_at: string;
};

export type OrganisationMember = {
  id: string;
  organisation_id: string;
  user_id: string | null;
  role: OrganisationRole;
  invited_email: string | null;
  status: string;
  joined_at: string;
};

export type TeamInvite = {
  id: string;
  organisation_id: string;
  invited_by: string | null;
  email: string;
  role: InviteRole;
  token: string;
  status: string;
  expires_at: string;
  created_at: string;
};

export type TeamMemberRow = {
  id: string;
  userId: string | null;
  firstName: string;
  lastName: string;
  email: string;
  role: OrganisationRole;
  status: "active" | "pending";
  joinedAt: string;
};

export type OrgContext = {
  organisationId: string;
  organisationName: string;
  plan: string;
  seatLimit: number;
  role: OrganisationRole;
  allowedEmailDomain: string | null;
  isSubscribed: boolean;
};

export type TeamPageLicenseInfo = {
  purchased: number;
  utilized: number;
  available: number;
  allowedEmailDomain: string | null;
  isSubscribed: boolean;
};
