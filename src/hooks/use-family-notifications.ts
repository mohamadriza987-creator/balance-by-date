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

    // Build OR filter for all my identifiers
    const orFilters: string[] = [];
    if (profile?.finny_user_id) {
      orFilters.push(`and(identifier_type.eq.finny_id,to_identifier.eq.${profile.finny_user_id})`);
    }
    if (user.email) {
      orFilters.push(`and(identifier_type.eq.email,to_identifier.eq.${user.email})`);
    }

    if (orFilters.length === 0) return;

    // Single query with OR filter
    const { data: invites, error } = await supabase
      .from("family_invitations")
      .select("*")
      .eq("status", "pending")
      .or(orFilters.join(","));

    if (error) {
      console.error("Failed to fetch invitations:", error);
      return;
    }

    const results = (invites || []) as unknown as FamilyInvitation[];
    // Filter out invitations sent BY me (I only want ones sent TO me)
    const incoming = results.filter(inv => inv.from_user_id !== user.id);

    setPendingInvitations(incoming);
    setHasPending(incoming.length > 0);
  }, [user]);

  useEffect(() => {
    fetchInvitations();
    const interval = setInterval(fetchInvitations, 15000); // Check every 15s
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
