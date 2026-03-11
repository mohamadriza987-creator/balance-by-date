import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export interface FamilyCircle {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
}

export interface CircleMember {
  id: string;
  circle_id: string;
  user_id: string;
  relationship: string;
  muted: boolean;
  joined_at: string;
  first_name?: string;
  last_name?: string;
  finny_user_id?: string;
}

export interface CircleMessage {
  id: string;
  circle_id: string;
  sender_user_id: string;
  sender_name: string;
  message: string;
  created_at: string;
  message_type: "text" | "voice" | "photo";
  expires_at: string | null;
  media_url: string | null;
}

export interface CircleInvitation {
  id: string;
  circle_id: string;
  from_user_id: string;
  to_user_id: string;
  relationship: string;
  status: string;
  created_at: string;
  // Enriched
  from_name?: string;
  circle_name?: string;
}

export function useFamilyCircles() {
  const { user } = useAuth();
  const [circles, setCircles] = useState<FamilyCircle[]>([]);
  const [members, setMembers] = useState<CircleMember[]>([]);
  const [messages, setMessages] = useState<CircleMessage[]>([]);
  const [pendingCircleInvites, setPendingCircleInvites] = useState<CircleInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastMessageTimes, setLastMessageTimes] = useState<Record<string, string>>({});

  const fetchCircles = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("family_circles")
      .select("*")
      .order("created_at", { ascending: true });
    if (!error && data) setCircles(data as FamilyCircle[]);
  }, [user]);

  const fetchMembers = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("family_circle_members")
      .select("*")
      .order("joined_at", { ascending: true });
    if (!error && data) {
      const userIds = [...new Set((data as any[]).map(m => m.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, finny_user_id")
        .in("user_id", userIds);
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      const enriched: CircleMember[] = (data as any[]).map(m => {
        const profile = profileMap.get(m.user_id);
        return { ...m, first_name: profile?.first_name || null, last_name: profile?.last_name || null, finny_user_id: profile?.finny_user_id || null };
      });
      setMembers(enriched);
    }
  }, [user]);

  const fetchMessages = useCallback(async (circleIds?: string[]) => {
    if (!user) return;
    const ids = circleIds || circles.map(c => c.id);
    if (ids.length === 0) return;
    const { data, error } = await supabase
      .from("family_messages")
      .select("*")
      .in("circle_id", ids)
      .order("created_at", { ascending: false })
      .limit(100);
    if (!error && data) {
      setMessages(data as CircleMessage[]);
      const times: Record<string, string> = {};
      (data as CircleMessage[]).forEach(msg => {
        if (msg.circle_id && (!times[msg.circle_id] || msg.created_at > times[msg.circle_id])) {
          times[msg.circle_id] = msg.created_at;
        }
      });
      setLastMessageTimes(times);
    }
  }, [user, circles]);

  const fetchCircleInvitations = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("family_circle_invitations" as any)
      .select("*")
      .eq("to_user_id", user.id)
      .eq("status", "pending");
    if (!error && data) {
      // Enrich with sender name and circle name
      const invites = data as any[];
      const fromIds = [...new Set(invites.map(i => i.from_user_id))];
      const circleIds = [...new Set(invites.map(i => i.circle_id))];
      
      const [profilesRes, circlesRes] = await Promise.all([
        fromIds.length > 0 ? supabase.from("profiles").select("user_id, first_name, last_name").in("user_id", fromIds) : { data: [] },
        circleIds.length > 0 ? supabase.from("family_circles").select("id, name").in("id", circleIds) : { data: [] },
      ]);
      
      const profileMap = new Map((profilesRes.data || []).map(p => [p.user_id, p]));
      const circleMap = new Map(((circlesRes.data || []) as any[]).map(c => [c.id, c]));
      
      const enriched: CircleInvitation[] = invites.map(inv => {
        const profile = profileMap.get(inv.from_user_id);
        const circle = circleMap.get(inv.circle_id);
        return {
          ...inv,
          from_name: [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Someone",
          circle_name: circle?.name || "Family Circle",
        };
      });
      setPendingCircleInvites(enriched);
    }
  }, [user]);

  // Initial load
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchCircles(), fetchMembers(), fetchCircleInvitations()]);
      setLoading(false);
    };
    load();
  }, [user, fetchCircles, fetchMembers, fetchCircleInvitations]);

  // Fetch messages when circles loaded
  useEffect(() => {
    if (circles.length > 0) {
      fetchMessages();
      const interval = setInterval(() => fetchMessages(), 8000);
      return () => clearInterval(interval);
    }
  }, [circles, fetchMessages]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("family-circles-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "family_circle_members" }, () => fetchMembers())
      .on("postgres_changes", { event: "*", schema: "public", table: "family_circles" }, () => fetchCircles())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "family_messages" }, () => fetchMessages())
      .on("postgres_changes", { event: "*", schema: "public", table: "family_circle_invitations" }, () => fetchCircleInvitations())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchCircles, fetchMembers, fetchMessages, fetchCircleInvitations]);

  const createCircle = useCallback(async (name: string): Promise<string | null> => {
    if (!user) return null;
    const { data, error } = await supabase
      .from("family_circles")
      .insert({ name, created_by: user.id } as any)
      .select()
      .single();
    if (error) { console.error("Create circle error:", error); toast.error("Failed to create family circle"); return null; }
    const circle = data as FamilyCircle;
    await supabase.from("family_circle_members").insert({ circle_id: circle.id, user_id: user.id, relationship: "self" } as any);
    await Promise.all([fetchCircles(), fetchMembers()]);
    toast.success(`Family circle "${name}" created! 🏡`);
    return circle.id;
  }, [user, fetchCircles, fetchMembers]);

  const renameCircle = useCallback(async (circleId: string, newName: string) => {
    const { error } = await supabase.from("family_circles").update({ name: newName } as any).eq("id", circleId);
    if (error) toast.error("Failed to rename circle");
    else { await fetchCircles(); toast.success("Circle renamed!"); }
  }, [fetchCircles]);

  // Send invitation instead of direct add
  const inviteToCircle = useCallback(async (circleId: string, toUserId: string, relationship: string) => {
    if (!user) return false;
    // Check if already a member
    const existing = members.find(m => m.circle_id === circleId && m.user_id === toUserId);
    if (existing) { toast.error("This person is already in the circle!"); return false; }

    const { error } = await supabase
      .from("family_circle_invitations" as any)
      .insert({ circle_id: circleId, from_user_id: user.id, to_user_id: toUserId, relationship } as any);
    if (error) {
      if (error.code === "23505") toast.error("Invitation already sent!");
      else { console.error("Invite error:", error); toast.error("Failed to send invitation"); }
      return false;
    }
    toast.success("Invitation sent! They'll need to accept it. 📩");
    return true;
  }, [user, members]);

  const acceptCircleInvite = useCallback(async (inviteId: string) => {
    if (!user) return false;
    const invite = pendingCircleInvites.find(i => i.id === inviteId);
    if (!invite) return false;

    // Update invitation status
    const { error: updateError } = await supabase
      .from("family_circle_invitations" as any)
      .update({ status: "accepted" } as any)
      .eq("id", inviteId);
    if (updateError) { toast.error("Failed to accept invitation"); return false; }

    // Add self as member
    const { error: memberError } = await supabase
      .from("family_circle_members")
      .insert({ circle_id: invite.circle_id, user_id: user.id, relationship: invite.relationship } as any);
    if (memberError && memberError.code !== "23505") {
      console.error("Join error:", memberError);
      toast.error("Failed to join circle");
      return false;
    }

    await Promise.all([fetchCircles(), fetchMembers(), fetchCircleInvitations()]);
    toast.success(`You joined "${invite.circle_name}"! 🎉`);
    return true;
  }, [user, pendingCircleInvites, fetchCircles, fetchMembers, fetchCircleInvitations]);

  const declineCircleInvite = useCallback(async (inviteId: string) => {
    const { error } = await supabase
      .from("family_circle_invitations" as any)
      .update({ status: "declined" } as any)
      .eq("id", inviteId);
    if (error) toast.error("Failed to decline invitation");
    else { await fetchCircleInvitations(); toast("Invitation declined"); }
  }, [fetchCircleInvitations]);

  // Keep addMemberToCircle for the family invitation accept flow (auto-add after family invite accepted)
  const addMemberToCircle = useCallback(async (circleId: string, userId: string, relationship: string) => {
    const { error } = await supabase
      .from("family_circle_members")
      .insert({ circle_id: circleId, user_id: userId, relationship } as any);
    if (error) {
      if (error.code === "23505") toast.error("This person is already in the circle!");
      else { console.error("Add member error:", error); toast.error("Failed to add member"); }
      return false;
    }
    await fetchMembers();
    return true;
  }, [fetchMembers]);

  const leaveCircle = useCallback(async (circleId: string) => {
    if (!user) return;
    const { error } = await supabase.from("family_circle_members").delete().eq("circle_id", circleId).eq("user_id", user.id);
    if (error) toast.error("Failed to leave circle");
    else { await Promise.all([fetchCircles(), fetchMembers()]); toast.success("You left the family circle"); }
  }, [user, fetchCircles, fetchMembers]);

  const toggleMute = useCallback(async (circleId: string) => {
    if (!user) return;
    const member = members.find(m => m.circle_id === circleId && m.user_id === user.id);
    if (!member) return;
    const { error } = await supabase.from("family_circle_members").update({ muted: !member.muted } as any).eq("id", member.id);
    if (error) toast.error("Failed to update mute setting");
    else { await fetchMembers(); toast.success(member.muted ? "Notifications unmuted" : "Circle muted 🔇"); }
  }, [user, members, fetchMembers]);

  const sendMessage = useCallback(async (
    circleId: string, message: string,
    options?: { messageType?: "text" | "voice" | "photo"; expiresInSeconds?: number; mediaUrl?: string }
  ) => {
    if (!user) return false;
    const msgType = options?.messageType || "text";
    if (msgType === "text" && !message.trim()) return false;

    const { data: myProfile } = await supabase.from("profiles").select("first_name, last_name").eq("user_id", user.id).maybeSingle();
    const senderName = [myProfile?.first_name, myProfile?.last_name].filter(Boolean).join(" ") || "Me";

    let expiresAt: string | null = null;
    if (options?.expiresInSeconds) expiresAt = new Date(Date.now() + options.expiresInSeconds * 1000).toISOString();

    const { error } = await supabase.from("family_messages").insert({
      sender_user_id: user.id, sender_name: senderName,
      message: message.trim() || (msgType === "voice" ? "🎤 Voice message" : "📷 Photo"),
      circle_id: circleId, message_type: msgType, expires_at: expiresAt,
      media_url: options?.mediaUrl || null,
    } as any);
    if (error) { console.error("Message send error:", error); toast.error("Failed to send message"); return false; }
    await fetchMessages();
    return true;
  }, [user, fetchMessages]);

  const uploadMedia = useCallback(async (file: Blob, extension: string): Promise<string | null> => {
    if (!user) return null;
    const fileName = `${user.id}/${Date.now()}.${extension}`;
    const { error } = await supabase.storage.from("family-media").upload(fileName, file);
    if (error) { console.error("Upload error:", error); toast.error("Failed to upload file"); return null; }
    const { data } = supabase.storage.from("family-media").getPublicUrl(fileName);
    return data.publicUrl;
  }, [user]);

  const deleteExpiredMessages = useCallback(() => {
    const now = new Date().toISOString();
    setMessages(prev => prev.filter(m => !m.expires_at || m.expires_at > now));
  }, []);

  const getCircleMembers = useCallback((circleId: string) => members.filter(m => m.circle_id === circleId), [members]);
  const getCircleMessages = useCallback((circleId: string) => messages.filter(m => m.circle_id === circleId), [messages]);
  const isMuted = useCallback((circleId: string) => {
    if (!user) return false;
    return members.find(m => m.circle_id === circleId && m.user_id === user.id)?.muted || false;
  }, [user, members]);
  const hasNewMessages = useCallback((circleId: string, lastSeen?: string) => {
    const latestTime = lastMessageTimes[circleId];
    if (!latestTime) return false;
    if (!lastSeen) return true;
    return latestTime > lastSeen;
  }, [lastMessageTimes]);

  useEffect(() => {
    const interval = setInterval(deleteExpiredMessages, 5000);
    return () => clearInterval(interval);
  }, [deleteExpiredMessages]);

  return {
    circles, members, messages, loading,
    pendingCircleInvites,
    createCircle, renameCircle,
    inviteToCircle, acceptCircleInvite, declineCircleInvite,
    addMemberToCircle, leaveCircle, toggleMute,
    sendMessage, uploadMedia,
    getCircleMembers, getCircleMessages, isMuted, hasNewMessages, lastMessageTimes,
    refetch: async () => { await Promise.all([fetchCircles(), fetchMembers(), fetchMessages(), fetchCircleInvitations()]); },
  };
}
