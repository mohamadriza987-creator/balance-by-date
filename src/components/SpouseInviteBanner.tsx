import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Heart, X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

interface Invitation {
  id: string;
  from_user_id: string;
  from_name?: string;
  from_finny_id?: string;
}

export function SpouseInviteBanner() {
  const { user } = useAuth();
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchInvitations = async () => {
      // Get current user's finny_user_id
      const { data: myProfile } = await supabase
        .from("profiles")
        .select("finny_user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!myProfile?.finny_user_id) return;

      // Check for pending invitations sent to me
      const { data: invites } = await supabase
        .from("spouse_invitations")
        .select("id, from_user_id")
        .eq("to_finny_user_id", myProfile.finny_user_id)
        .eq("status", "pending")
        .limit(1);

      if (!invites || invites.length === 0) return;

      const invite = invites[0];

      // Get sender's profile info
      const { data: senderProfile } = await supabase
        .from("profiles")
        .select("first_name, last_name, finny_user_id")
        .eq("user_id", invite.from_user_id)
        .maybeSingle();

      setInvitation({
        id: invite.id,
        from_user_id: invite.from_user_id,
        from_name: senderProfile
          ? `${senderProfile.first_name || ""} ${senderProfile.last_name || ""}`.trim() || "Someone"
          : "Someone",
        from_finny_id: senderProfile?.finny_user_id || undefined,
      });
    };

    fetchInvitations();
  }, [user]);

  const handleAccept = async () => {
    if (!invitation || !user) return;
    setActing(true);

    // Update invitation status
    const { error: invErr } = await supabase
      .from("spouse_invitations")
      .update({ status: "accepted" })
      .eq("id", invitation.id);

    if (invErr) {
      toast.error("Failed to accept invitation");
      setActing(false);
      return;
    }

    // Link both profiles
    await supabase
      .from("profiles")
      .update({ spouse_user_id: invitation.from_user_id })
      .eq("user_id", user.id);

    await supabase
      .from("profiles")
      .update({ spouse_user_id: user.id })
      .eq("user_id", invitation.from_user_id);

    toast.success(`You and ${invitation.from_name} are now connected! 💕`);
    setInvitation(null);
    setActing(false);
  };

  const handleDecline = async () => {
    if (!invitation) return;
    setActing(true);

    await supabase
      .from("spouse_invitations")
      .update({ status: "rejected" })
      .eq("id", invitation.id);

    toast("Invitation declined");
    setInvitation(null);
    setActing(false);
  };

  if (!invitation) return null;

  return (
    <div className="mx-3 mt-2 rounded-xl border border-primary/20 bg-primary/5 p-3 animate-slide-up-fade">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Heart className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            {invitation.from_name} wants to connect as your spouse
          </p>
          {invitation.from_finny_id && (
            <p className="text-xs text-muted-foreground">@{invitation.from_finny_id}</p>
          )}
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <Button
          size="sm"
          className="flex-1 rounded-xl text-xs"
          onClick={handleAccept}
          disabled={acting}
        >
          <Check className="h-3.5 w-3.5 mr-1" /> Accept
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 rounded-xl text-xs"
          onClick={handleDecline}
          disabled={acting}
        >
          <X className="h-3.5 w-3.5 mr-1" /> Decline
        </Button>
      </div>
    </div>
  );
}
