import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getUserRole } from "@/lib/team/org";
import {
  canEditContracts,
  canUploadContracts,
  canUseAiChat,
} from "@/lib/team/roles";
import type { OrganisationRole } from "@/lib/team/types";

export async function requireOrgRole(
  supabase: SupabaseClient,
  user: User,
  check: (role: OrganisationRole) => boolean
) {
  const role = await getUserRole(supabase, user.id);
  const effectiveRole = role ?? "owner";

  if (!check(effectiveRole)) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "You do not have permission to perform this action." },
        { status: 403 }
      ),
    };
  }

  return { ok: true as const, role: effectiveRole };
}

export const requireCanUpload = (role: OrganisationRole) =>
  canUploadContracts(role);

export const requireCanEdit = (role: OrganisationRole) =>
  canEditContracts(role);

export const requireCanChat = (role: OrganisationRole) => canUseAiChat(role);
