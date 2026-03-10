import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export interface FamilyInvitation {
  id: string;
  from_user_id: string;
  from_first_name: string | null;
  from_last_name: string | null;
  relationship: string;
  status: string;
  identifier_type: string;
  to_identifier: string;
}

export function useFamilyNotifications() {
  const { user } = useAuth();
  const [pendingInvitations, setPendingInvitations] = useState<FamilyInvitation[]>([]);
  const [hasPending, setHasPending] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const fetchInvitations = useCallback(async () => {
    if (!user) return;

    // Get my finny_user_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("finny_user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    // Build list of identifiers to check (finny_user_id + email)
    const myIdentifiers: { type: string; value: string }[] = [];
    if (profile?.finny_user_id) {
      myIdentifiers.push({ type: "finny_id", value: profile.finny_user_id });
    }
    if (user.email) {
      myIdentifiers.push({ type: "email", value: user.email });
    }

    if (myIdentifiers.length === 0) return;

    // Query for invitations matching any of my identifiers
    let allInvites: FamilyInvitation[] = [];
    for (const ident of myIdentifiers) {
      const { data: invites } = await supabase
        .from("family_invitations")
        .select("*")
        .eq("to_identifier", ident.value)
        .eq("identifier_type", ident.type)
        .eq("status", "pending");

      if (invites && invites.length > 0) {
        allInvites = [...allInvites, ...(invites as unknown as FamilyInvitation[])];
      }
    }

    // Deduplicate by id
    const uniqueInvites = allInvites.filter((inv, idx, arr) => arr.findIndex(i => i.id === inv.id) === idx);

    if (uniqueInvites.length > 0) {
      setPendingInvitations(uniqueInvites);
      setHasPending(true);
    } else {
      setPendingInvitations([]);
      setHasPending(false);
    }
  }, [user]);

  useEffect(() => {
    fetchInvitations();
    // Also check for spouse invitations (legacy)
    const interval = setInterval(fetchInvitations, 30000);
    return () => clearInterval(interval);
  }, [fetchInvitations]);

  const dismiss = useCallback(() => setDismissed(true), []);
  const undismiss = useCallback(() => setDismissed(false), []);

  return {
    pendingInvitations,
    hasPending: hasPending && !dismissed,
    hasRawPending: hasPending,
    dismiss,
    undismiss,
    refetch: fetchInvitations,
  };
}

// Relationship limits
export const FAMILY_LIMITS: Record<string, number> = {
  spouse: 1,
  parent: 2,
  sibling: 4,
  child: 4,
};
