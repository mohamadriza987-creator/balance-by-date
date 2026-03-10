import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Heart, Users, PiggyBank, Target, Plus, Check, X,
  Baby, UserPlus, Gift, ArrowRight, Sparkles, TreePine, Mail, AtSign, Send, Loader2
} from "lucide-react";
import type {
  AppData, FamilyMember, FamilyRequest, PiggyBank as PiggyBankType,
  SharedGoal, FamilyRelationship, FamilyRequestType, FamilyRequestStatus,
  PiggyBankContribution, SharedGoalContribution
} from "@/lib/finance-types";
import { formatMoney } from "@/lib/finance-utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { FAMILY_LIMITS, type FamilyInvitation } from "@/hooks/use-family-notifications";

interface FamilyLandTabProps {
  data: AppData;
  onAddFamilyMember: (m: Omit<FamilyMember, "id">) => void;
  onRemoveFamilyMember: (id: string) => void;
  onAddFamilyRequest: (r: Omit<FamilyRequest, "id">) => void;
  onUpdateFamilyRequest: (id: string, updates: Partial<FamilyRequest>) => void;
  onAddPiggyBank: (pb: Omit<PiggyBankType, "id" | "contributions">) => void;
  onAddPiggyBankContribution: (pbId: string, c: Omit<PiggyBankContribution, "id">) => void;
  onRemovePiggyBank: (id: string) => void;
  onAddSharedGoal: (g: Omit<SharedGoal, "id" | "contributions">) => void;
  onAddSharedGoalContribution: (goalId: string, c: Omit<SharedGoalContribution, "id">) => void;
  onRemoveSharedGoal: (id: string) => void;
  pendingInvitations?: FamilyInvitation[];
  onInvitationHandled?: () => void;
}

const RELATIONSHIP_EMOJIS: Record<FamilyRelationship, string[]> = {
  spouse: ["💑", "💍", "❤️"],
  child: ["👧", "👦", "🧒", "👶"],
  parent: ["👨‍🦳", "👩‍🦳", "🧓"],
  sibling: ["🤝", "👫", "👬", "👭"],
};

const todayStr = () => new Date().toISOString().slice(0, 10);

export function FamilyLandTab({
  data,
  onAddFamilyMember, onRemoveFamilyMember,
  onAddFamilyRequest, onUpdateFamilyRequest,
  onAddPiggyBank, onAddPiggyBankContribution, onRemovePiggyBank,
  onAddSharedGoal, onAddSharedGoalContribution, onRemoveSharedGoal,
  pendingInvitations = [],
  onInvitationHandled,
}: FamilyLandTabProps) {
  const family = data.familyData || { members: [], requests: [], piggyBanks: [], sharedGoals: [] };
  const cs = data.userProfile?.currencySymbol || "$";
  const fmt = (n: number) => formatMoney(n, data.userProfile);

  const pendingRequests = family.requests.filter(r => r.status === "pending");

  const insights = useMemo(() => {
    const msgs: { text: string; emoji: string }[] = [];
    if (pendingInvitations.length > 0) {
      msgs.push({ text: `You have ${pendingInvitations.length} family invitation${pendingInvitations.length > 1 ? "s" : ""} waiting! 💌`, emoji: "📬" });
    }
    if (pendingRequests.length > 0) {
      msgs.push({ text: `You have ${pendingRequests.length} family request${pendingRequests.length > 1 ? "s" : ""} waiting for your attention.`, emoji: "📬" });
    }
    family.piggyBanks.forEach(pb => {
      const pct = pb.targetAmount > 0 ? (pb.currentAmount / pb.targetAmount) * 100 : 0;
      if (pct >= 100) {
        msgs.push({ text: `${pb.childName}'s piggy bank is full! 🎉 Time to celebrate!`, emoji: "🐷" });
      }
    });
    family.sharedGoals.forEach(g => {
      const total = g.contributions.reduce((s, c) => s + c.amount, 0);
      const pct = g.targetAmount > 0 ? (total / g.targetAmount) * 100 : 0;
      if (pct >= 75 && pct < 100) {
        msgs.push({ text: `"${g.name}" is almost there — ${Math.round(pct)}% done!`, emoji: "🌟" });
      }
    });
    if (family.members.length === 0 && pendingInvitations.length === 0) {
      msgs.push({ text: "Invite your first family member to start your Family Land! 🌱", emoji: "👋" });
    }
    return msgs.slice(0, 3);
  }, [family, pendingRequests, pendingInvitations]);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Welcome Banner */}
      <div className="finnyland-card p-4 finnyland-gradient">
        <div className="flex items-center gap-3">
          <div className="text-3xl">🏡</div>
          <div>
            <h2 className="text-base font-bold text-foreground">My Family Land</h2>
            <p className="text-xs text-muted-foreground">Your cozy corner for family goals, requests & piggy banks</p>
          </div>
        </div>
      </div>

      {/* Family Insights */}
      {insights.length > 0 && (
        <div className="space-y-2">
          {insights.map((msg, i) => (
            <div key={i} className="flex items-start gap-2.5 rounded-xl bg-accent/10 border border-accent/20 px-3 py-2.5">
              <span className="text-lg flex-shrink-0">{msg.emoji}</span>
              <p className="text-xs text-foreground/80 leading-relaxed">{msg.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* Pending Family Invitations */}
      {pendingInvitations.length > 0 && (
        <FamilyInvitationsSection
          invitations={pendingInvitations}
          onAddFamilyMember={onAddFamilyMember}
          onInvitationHandled={onInvitationHandled}
        />
      )}

      {/* Family Members */}
      <FamilyMembersSection
        members={family.members}
        onAdd={onAddFamilyMember}
        onRemove={onRemoveFamilyMember}
      />

      {/* Family Requests */}
      <FamilyRequestsSection
        requests={family.requests}
        members={family.members}
        onAdd={onAddFamilyRequest}
        onUpdate={onUpdateFamilyRequest}
        userName={data.userProfile?.name || "Me"}
        cs={cs}
        fmt={fmt}
      />

      {/* Piggy Banks */}
      <PiggyBanksSection
        piggyBanks={family.piggyBanks}
        members={family.members}
        onAdd={onAddPiggyBank}
        onContribute={onAddPiggyBankContribution}
        onRemove={onRemovePiggyBank}
        userName={data.userProfile?.name || "Me"}
        cs={cs}
        fmt={fmt}
      />

      {/* Shared Goals */}
      <SharedGoalsSection
        goals={family.sharedGoals}
        members={family.members}
        onAdd={onAddSharedGoal}
        onContribute={onAddSharedGoalContribution}
        onRemove={onRemoveSharedGoal}
        userName={data.userProfile?.name || "Me"}
        cs={cs}
        fmt={fmt}
      />
    </div>
  );
}

// ─── Family Invitations (Accept/Decline incoming) ────────────
function FamilyInvitationsSection({ invitations, onAddFamilyMember, onInvitationHandled }: {
  invitations: FamilyInvitation[];
  onAddFamilyMember: (m: Omit<FamilyMember, "id">) => void;
  onInvitationHandled?: () => void;
}) {
  const { user } = useAuth();
  const [acting, setActing] = useState<string | null>(null);

  const handleAccept = async (inv: FamilyInvitation) => {
    if (!user) return;
    setActing(inv.id);

    // Update invitation status
    const { error } = await supabase
      .from("family_invitations")
      .update({ status: "accepted" } as any)
      .eq("id", inv.id);

    if (error) {
      toast.error("Failed to accept invitation");
      setActing(null);
      return;
    }

    // Add to local family members
    const name = [inv.from_first_name, inv.from_last_name].filter(Boolean).join(" ") || "Family Member";
    const rel = inv.relationship as FamilyRelationship;
    const emojis = RELATIONSHIP_EMOJIS[rel] || ["👤"];
    onAddFamilyMember({
      name,
      relationship: rel,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      linkedUserId: inv.from_user_id,
      addedDate: todayStr(),
    });

    // If spouse, also link profiles
    if (rel === "spouse") {
      await supabase
        .from("profiles")
        .update({ spouse_user_id: inv.from_user_id })
        .eq("user_id", user.id);
      await supabase
        .from("profiles")
        .update({ spouse_user_id: user.id })
        .eq("user_id", inv.from_user_id);
    }

    // Notify the sender by creating a reverse invitation record they can see
    // (the sender's notification hook will pick this up)

    toast.success(`${name} has been added to your Family Land! 🏡`);
    setActing(null);
    onInvitationHandled?.();
  };

  const handleDecline = async (inv: FamilyInvitation) => {
    setActing(inv.id);
    await supabase
      .from("family_invitations")
      .update({ status: "declined" } as any)
      .eq("id", inv.id);
    toast("Invitation declined");
    setActing(null);
    onInvitationHandled?.();
  };

  return (
    <Card className="border-2 border-primary/30 bg-primary/5 finnyland-card">
      <CardHeader className="pb-2 px-4 pt-4">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary animate-pulse" /> Family Invitations
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {invitations.map(inv => {
          const name = [inv.from_first_name, inv.from_last_name].filter(Boolean).join(" ") || "Someone";
          const relEmoji = inv.relationship === "spouse" ? "💍" : inv.relationship === "child" ? "🧒" : inv.relationship === "parent" ? "🧓" : "🤝";
          return (
            <div key={inv.id} className="rounded-xl bg-background border border-primary/20 p-3 animate-slide-up-fade">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-lg">
                  {relEmoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    has requested to add you to Family Land as <span className="font-medium capitalize text-foreground">{inv.relationship}</span>
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  className="flex-1 rounded-xl text-xs"
                  onClick={() => handleAccept(inv)}
                  disabled={acting === inv.id}
                >
                  {acting === inv.id ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                  Confirm
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 rounded-xl text-xs"
                  onClick={() => handleDecline(inv)}
                  disabled={acting === inv.id}
                >
                  <X className="h-3.5 w-3.5 mr-1" /> Decline
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ─── Family Members Section ──────────────────────────────────
function FamilyMembersSection({ members, onAdd, onRemove }: {
  members: FamilyMember[];
  onAdd: (m: Omit<FamilyMember, "id">) => void;
  onRemove: (id: string) => void;
}) {
  const { user } = useAuth();
  const [showInvite, setShowInvite] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [relationship, setRelationship] = useState<FamilyRelationship>("spouse");
  const [sending, setSending] = useState(false);

  // Live lookup state
  const [lookupResult, setLookupResult] = useState<{
    status: "idle" | "searching" | "found" | "not_found" | "self";
    name?: string;
    finnyId?: string;
    userId?: string;
  }>({ status: "idle" });

  // Debounced live lookup
  useEffect(() => {
    const val = identifier.trim().replace(/^@/, "");
    if (!val || val.length < 2) {
      setLookupResult({ status: "idle" });
      return;
    }

    const isEmail = val.includes("@") && !val.startsWith("@");

    // For email, require at least user@d.c pattern
    if (isEmail && !val.match(/.+@.+\..+/)) {
      setLookupResult({ status: "idle" });
      return;
    }

    setLookupResult({ status: "searching" });

    const timer = setTimeout(async () => {
      try {
        let profile: any = null;

        if (isEmail) {
          // Look up by email — we need to check profiles joined with auth
          // Since we can't query auth.users from client, check if any profile 
          // has this email by querying family_invitations won't work.
          // Instead, we look up profiles table — but email is in auth.users.
          // Workaround: try to find a profile where the user has this email
          // by checking all profiles isn't possible. So for email invites,
          // we show a neutral "invitation will be sent" message.
          // But we CAN check if the email matches our own.
          if (user?.email === val) {
            setLookupResult({ status: "self" });
            return;
          }
          // For email, we can't look up the name client-side (auth.users not accessible)
          // Show a neutral status
          setLookupResult({ status: "found", name: val });
        } else {
          // Look up by finny_user_id
          const { data } = await supabase
            .from("profiles")
            .select("user_id, first_name, last_name, finny_user_id")
            .eq("finny_user_id", val)
            .maybeSingle();

          if (data) {
            if (data.user_id === user?.id) {
              setLookupResult({ status: "self" });
            } else {
              const name = [data.first_name, data.last_name].filter(Boolean).join(" ") || "Unknown User";
              setLookupResult({ status: "found", name, finnyId: data.finny_user_id || undefined, userId: data.user_id });
            }
          } else {
            setLookupResult({ status: "not_found" });
          }
        }
      } catch {
        setLookupResult({ status: "idle" });
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [identifier, user]);

  // Check limits
  const memberCounts = useMemo(() => {
    const counts: Record<string, number> = { spouse: 0, parent: 0, sibling: 0, child: 0 };
    members.forEach(m => { counts[m.relationship] = (counts[m.relationship] || 0) + 1; });
    return counts;
  }, [members]);

  const isAtLimit = (rel: FamilyRelationship) => memberCounts[rel] >= (FAMILY_LIMITS[rel] || 99);
  const availableRelationships = (["spouse", "parent", "sibling", "child"] as FamilyRelationship[]).filter(r => !isAtLimit(r));

  const handleInvite = async () => {
    if (!identifier.trim() || !user) return;
    if (lookupResult.status === "self") {
      toast.error("You can't invite yourself! 😄");
      return;
    }
    if (lookupResult.status === "not_found") {
      const isEmail = identifier.includes("@") && !identifier.startsWith("@");
      if (!isEmail) {
        toast.error("This user doesn't exist. Double-check the username.");
        return;
      }
    }

    setSending(true);
    try {
      const { data: myProfile } = await supabase
        .from("profiles")
        .select("first_name, last_name, finny_user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      const isEmail = identifier.includes("@") && !identifier.startsWith("@");
      const cleanIdentifier = identifier.trim().replace(/^@/, "");

      // Check for duplicate pending invitation
      const { data: existing } = await supabase
        .from("family_invitations")
        .select("id")
        .eq("from_user_id", user.id)
        .eq("to_identifier", cleanIdentifier)
        .eq("status", "pending");

      if (existing && existing.length > 0) {
        toast.error("You already have a pending invitation to this user.");
        setSending(false);
        return;
      }

      // Create invitation
      const { error } = await supabase
        .from("family_invitations")
        .insert({
          from_user_id: user.id,
          to_identifier: cleanIdentifier,
          identifier_type: isEmail ? "email" : "finny_id",
          relationship,
          from_first_name: myProfile?.first_name || null,
          from_last_name: myProfile?.last_name || null,
        } as any);

      if (error) {
        console.error("Insert error:", error);
        toast.error("Failed to send invitation");
        setSending(false);
        return;
      }

      // Send email for email-based invites
      if (isEmail) {
        const senderName = [myProfile?.first_name, myProfile?.last_name].filter(Boolean).join(" ") || "Someone";
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const resp = await supabase.functions.invoke("send-family-invite-email", {
            body: {
              email: cleanIdentifier,
              fromName: senderName,
              relationship,
            },
          });
          if (resp.error) console.error("Email function error:", resp.error);
        } catch (emailErr) {
          console.error("Email send failed:", emailErr);
        }
        toast.success(`Invitation sent to ${cleanIdentifier}! 📧`);
      } else {
        toast.success(`Invitation sent to @${cleanIdentifier}! They'll see it in their Family tab. 💌`);
      }

      setIdentifier("");
      setShowInvite(false);
    } catch (err) {
      console.error("Invite error:", err);
      toast.error("Something went wrong. Please try again.");
    }
    setSending(false);
  };

  const canSend = identifier.trim().length >= 2 && lookupResult.status !== "self" && lookupResult.status !== "searching" &&
    !(lookupResult.status === "not_found" && !identifier.includes("@"));

  return (
    <Card className="finnyland-card">
      <CardHeader className="pb-2 px-4 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> Family Circle
          </CardTitle>
          {availableRelationships.length > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowInvite(!showInvite)}>
              <UserPlus className="h-3 w-3 mr-1" /> Invite
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {showInvite && (
          <div className="flex flex-col gap-2.5 mb-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
            <p className="text-xs text-muted-foreground">Invite by <span className="font-medium text-foreground">Username</span> or <span className="font-medium text-foreground">Email</span></p>
            <div className="relative">
              <Input
                placeholder="@username or email@example.com"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                className="h-9 text-sm pl-8"
              />
              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                {identifier.includes("@") && !identifier.startsWith("@") ? <Mail className="h-3.5 w-3.5" /> : <AtSign className="h-3.5 w-3.5" />}
              </div>
            </div>

            {/* Live lookup result */}
            {lookupResult.status === "searching" && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Looking up user...
              </div>
            )}
            {lookupResult.status === "found" && (
              <div className="flex items-center gap-2 text-xs text-primary bg-primary/10 rounded-lg px-3 py-2 border border-primary/20">
                <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="font-medium">{lookupResult.name}</span>
                {lookupResult.finnyId && <span className="text-muted-foreground">@{lookupResult.finnyId}</span>}
                {!lookupResult.finnyId && identifier.includes("@") && (
                  <span className="text-muted-foreground">— invitation will be sent via email</span>
                )}
              </div>
            )}
            {lookupResult.status === "not_found" && (
              <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2 border border-destructive/20">
                <X className="h-3.5 w-3.5 shrink-0" />
                {identifier.includes("@") && !identifier.startsWith("@")
                  ? <span>No account found — an invite email will be sent to sign up</span>
                  : <span>User not found. Check the username and try again.</span>
                }
              </div>
            )}
            {lookupResult.status === "self" && (
              <div className="flex items-center gap-2 text-xs text-warning bg-warning/10 rounded-lg px-3 py-2 border border-warning/20">
                <span>😄</span> <span>That's you! Try a different username or email.</span>
              </div>
            )}

            <Select value={relationship} onValueChange={(v) => setRelationship(v as FamilyRelationship)}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {availableRelationships.map(r => (
                  <SelectItem key={r} value={r}>
                    {r === "spouse" ? "💍 Spouse / Partner" : r === "child" ? "🧒 Child" : r === "parent" ? "🧓 Parent" : "🤝 Sibling"}
                    <span className="text-muted-foreground ml-1 text-[10px]">
                      ({memberCounts[r]}/{FAMILY_LIMITS[r]})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-1.5 flex-wrap">
              {Object.entries(FAMILY_LIMITS).map(([rel, max]) => (
                <span key={rel} className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${
                  memberCounts[rel] >= max ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
                }`}>
                  {rel}: {memberCounts[rel]}/{max}
                </span>
              ))}
            </div>
            <Button size="sm" className="h-8 text-xs" onClick={handleInvite} disabled={!canSend || sending}>
              {sending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1" />}
              Send Invitation
            </Button>
          </div>
        )}

        {members.length === 0 ? (
          <div className="text-center py-6">
            <div className="text-4xl mb-2">🌱</div>
            <p className="text-xs text-muted-foreground">Your family circle is empty. Invite someone to get started!</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {members.map(m => (
              <div key={m.id} className="flex items-center gap-2 rounded-full bg-secondary/60 border border-border px-3 py-1.5 group">
                <span className="text-lg">{m.emoji}</span>
                <div>
                  <span className="text-xs font-semibold text-foreground">{m.name}</span>
                  <span className="text-[10px] text-muted-foreground ml-1 capitalize">({m.relationship})</span>
                  {m.linkedUserId && <span className="text-[10px] text-primary ml-1">✓ Linked</span>}
                </div>
                <button onClick={() => onRemove(m.id)} className="opacity-0 group-hover:opacity-100 text-destructive/60 hover:text-destructive transition-opacity ml-1">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Family Requests Section ─────────────────────────────────
function FamilyRequestsSection({ requests, members, onAdd, onUpdate, userName, cs, fmt }: {
  requests: FamilyRequest[];
  members: FamilyMember[];
  onAdd: (r: Omit<FamilyRequest, "id">) => void;
  onUpdate: (id: string, u: Partial<FamilyRequest>) => void;
  userName: string;
  cs: string;
  fmt: (n: number) => string;
}) {
  const [showForm, setShowForm] = useState(false);
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<FamilyRequestType>("purchase");
  const [toMemberId, setToMemberId] = useState("");

  const pending = requests.filter(r => r.status === "pending");
  const handled = requests.filter(r => r.status !== "pending").slice(-5);

  const handleAdd = () => {
    if (!desc.trim() || !amount) return;
    onAdd({
      fromMemberId: "self",
      toMemberId: toMemberId || undefined,
      type,
      description: desc.trim(),
      amount: parseFloat(amount),
      status: "pending",
      date: todayStr(),
    });
    setDesc("");
    setAmount("");
    setShowForm(false);
  };

  return (
    <Card className="finnyland-card">
      <CardHeader className="pb-2 px-4 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Gift className="h-4 w-4 text-accent" /> Family Requests
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-3 w-3 mr-1" /> New
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {showForm && (
          <div className="flex flex-col gap-2 p-3 rounded-xl bg-accent/5 border border-accent/20">
            <Input placeholder="What's the request?" value={desc} onChange={e => setDesc(e.target.value)} className="h-9 text-sm" />
            <Input placeholder="Amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} className="h-9 text-sm" />
            <Select value={type} onValueChange={(v) => setType(v as FamilyRequestType)}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="purchase">🛒 Purchase</SelectItem>
                <SelectItem value="contribution">💰 Contribution</SelectItem>
                <SelectItem value="allowance">🎒 Allowance</SelectItem>
                <SelectItem value="other">📝 Other</SelectItem>
              </SelectContent>
            </Select>
            {members.length > 0 && (
              <Select value={toMemberId} onValueChange={setToMemberId}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Assign to..." /></SelectTrigger>
                <SelectContent>
                  {members.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.emoji} {m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button size="sm" className="h-8 text-xs" onClick={handleAdd} disabled={!desc.trim() || !amount}>
              Send Request
            </Button>
          </div>
        )}

        {pending.length === 0 && handled.length === 0 && !showForm && (
          <div className="text-center py-4">
            <div className="text-3xl mb-2">📭</div>
            <p className="text-xs text-muted-foreground">No requests yet. Create one to get the family coordinating!</p>
          </div>
        )}

        {pending.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Pending</p>
            {pending.map(r => {
              const member = members.find(m => m.id === r.toMemberId);
              return (
                <div key={r.id} className="flex items-center gap-3 rounded-xl bg-warning/5 border border-warning/15 px-3 py-2.5">
                  <div className="text-lg">
                    {r.type === "purchase" ? "🛒" : r.type === "contribution" ? "💰" : r.type === "allowance" ? "🎒" : "📝"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{r.description}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {fmt(r.amount)} {member ? `→ ${member.name}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => onUpdate(r.id, { status: "approved" })} className="rounded-full bg-primary/10 hover:bg-primary/20 p-1.5 text-primary transition-colors">
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => onUpdate(r.id, { status: "rejected" })} className="rounded-full bg-destructive/10 hover:bg-destructive/20 p-1.5 text-destructive transition-colors">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {handled.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Recent</p>
            {handled.map(r => (
              <div key={r.id} className="flex items-center gap-2 rounded-lg px-3 py-2 bg-secondary/30">
                <p className="text-xs text-muted-foreground flex-1 truncate">{r.description} — {fmt(r.amount)}</p>
                <Badge variant={r.status === "approved" ? "default" : "destructive"} className="text-[10px] h-5">
                  {r.status === "approved" ? "✓ Approved" : "✗ Declined"}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Piggy Banks Section ─────────────────────────────────────
function PiggyBanksSection({ piggyBanks, members, onAdd, onContribute, onRemove, userName, cs, fmt }: {
  piggyBanks: PiggyBankType[];
  members: FamilyMember[];
  onAdd: (pb: Omit<PiggyBankType, "id" | "contributions">) => void;
  onContribute: (pbId: string, c: Omit<PiggyBankContribution, "id">) => void;
  onRemove: (id: string) => void;
  userName: string;
  cs: string;
  fmt: (n: number) => string;
}) {
  const [showForm, setShowForm] = useState(false);
  const [childName, setChildName] = useState("");
  const [target, setTarget] = useState("");
  const [contribPbId, setContribPbId] = useState<string | null>(null);
  const [contribAmount, setContribAmount] = useState("");
  const [contribNote, setContribNote] = useState("");

  const childMembers = members.filter(m => m.relationship === "child");

  const handleAdd = () => {
    if (!childName.trim() || !target) return;
    const childMember = childMembers.find(m => m.name === childName);
    onAdd({
      childMemberId: childMember?.id || "",
      childName: childName.trim(),
      targetAmount: parseFloat(target),
      currentAmount: 0,
      emoji: "🐷",
    });
    setChildName("");
    setTarget("");
    setShowForm(false);
  };

  const handleContribute = (pbId: string) => {
    if (!contribAmount) return;
    onContribute(pbId, {
      amount: parseFloat(contribAmount),
      date: todayStr(),
      fromMemberName: userName,
      note: contribNote || undefined,
    });
    setContribAmount("");
    setContribNote("");
    setContribPbId(null);
  };

  return (
    <Card className="finnyland-card">
      <CardHeader className="pb-2 px-4 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <PiggyBank className="h-4 w-4 text-primary" /> Piggy Banks
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-3 w-3 mr-1" /> New
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {showForm && (
          <div className="flex flex-col gap-2 p-3 rounded-xl bg-primary/5 border border-primary/15">
            {childMembers.length > 0 ? (
              <Select value={childName} onValueChange={setChildName}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select child" /></SelectTrigger>
                <SelectContent>
                  {childMembers.map(m => (
                    <SelectItem key={m.id} value={m.name}>{m.emoji} {m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input placeholder="Child's name" value={childName} onChange={e => setChildName(e.target.value)} className="h-9 text-sm" />
            )}
            <Input placeholder="Target amount" type="number" value={target} onChange={e => setTarget(e.target.value)} className="h-9 text-sm" />
            <Button size="sm" className="h-8 text-xs" onClick={handleAdd} disabled={!childName.trim() || !target}>
              🐷 Create Piggy Bank
            </Button>
          </div>
        )}

        {piggyBanks.length === 0 && !showForm && (
          <div className="text-center py-4">
            <div className="text-4xl mb-2">🐷</div>
            <p className="text-xs text-muted-foreground">No piggy banks yet. Start one for a little saver!</p>
          </div>
        )}

        {piggyBanks.map(pb => {
          const pct = pb.targetAmount > 0 ? Math.min((pb.currentAmount / pb.targetAmount) * 100, 100) : 0;
          return (
            <div key={pb.id} className="rounded-xl bg-secondary/40 border border-border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{pb.emoji}</span>
                  <div>
                    <p className="text-xs font-bold text-foreground">{pb.childName}'s Piggy Bank</p>
                    <p className="text-[10px] text-muted-foreground">{fmt(pb.currentAmount)} of {fmt(pb.targetAmount)}</p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-[10px]">{Math.round(pct)}%</Badge>
              </div>
              <Progress value={pct} className="h-2" />

              {contribPbId === pb.id ? (
                <div className="flex gap-2 items-center">
                  <Input placeholder="Amount" type="number" value={contribAmount} onChange={e => setContribAmount(e.target.value)} className="h-8 text-xs flex-1" />
                  <Input placeholder="Note (optional)" value={contribNote} onChange={e => setContribNote(e.target.value)} className="h-8 text-xs flex-1" />
                  <Button size="sm" className="h-8 text-xs px-3" onClick={() => handleContribute(pb.id)} disabled={!contribAmount}>
                    <Plus className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 text-xs px-2" onClick={() => setContribPbId(null)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" className="h-7 text-xs w-full" onClick={() => setContribPbId(pb.id)}>
                  🪙 Drop some coins
                </Button>
              )}

              {pb.contributions.length > 0 && (
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {pb.contributions.slice(-3).map(c => (
                    <div key={c.id} className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span>🪙</span>
                      <span>{c.fromMemberName} added {fmt(c.amount)}</span>
                      {c.note && <span className="italic">— {c.note}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ─── Shared Goals Section ────────────────────────────────────
function SharedGoalsSection({ goals, members, onAdd, onContribute, onRemove, userName, cs, fmt }: {
  goals: SharedGoal[];
  members: FamilyMember[];
  onAdd: (g: Omit<SharedGoal, "id" | "contributions">) => void;
  onContribute: (goalId: string, c: Omit<SharedGoalContribution, "id">) => void;
  onRemove: (id: string) => void;
  userName: string;
  cs: string;
  fmt: (n: number) => string;
}) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [emoji, setEmoji] = useState("🎯");
  const [contribGoalId, setContribGoalId] = useState<string | null>(null);
  const [contribAmount, setContribAmount] = useState("");
  const [contribMember, setContribMember] = useState("");

  const goalEmojis = ["🎯", "🏖️", "🚗", "🏠", "💻", "🎓", "🎉", "✈️", "📱", "🎸"];

  const handleAdd = () => {
    if (!name.trim() || !target) return;
    onAdd({
      name: name.trim(),
      targetAmount: parseFloat(target),
      emoji,
      createdDate: todayStr(),
    });
    setName("");
    setTarget("");
    setShowForm(false);
  };

  const handleContribute = (goalId: string) => {
    if (!contribAmount) return;
    onContribute(goalId, {
      memberId: "self",
      memberName: contribMember || userName,
      amount: parseFloat(contribAmount),
      date: todayStr(),
    });
    setContribAmount("");
    setContribMember("");
    setContribGoalId(null);
  };

  return (
    <Card className="finnyland-card">
      <CardHeader className="pb-2 px-4 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Target className="h-4 w-4 text-accent" /> Shared Goals
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-3 w-3 mr-1" /> New
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {showForm && (
          <div className="flex flex-col gap-2 p-3 rounded-xl bg-accent/5 border border-accent/20">
            <Input placeholder="Goal name (e.g. Family Vacation)" value={name} onChange={e => setName(e.target.value)} className="h-9 text-sm" />
            <Input placeholder="Target amount" type="number" value={target} onChange={e => setTarget(e.target.value)} className="h-9 text-sm" />
            <div className="flex gap-1.5 flex-wrap">
              {goalEmojis.map(e => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={`text-lg p-1 rounded-lg transition-all ${emoji === e ? "bg-accent/20 ring-2 ring-accent/40 scale-110" : "hover:bg-secondary/50"}`}
                >
                  {e}
                </button>
              ))}
            </div>
            <Button size="sm" className="h-8 text-xs" onClick={handleAdd} disabled={!name.trim() || !target}>
              Create Family Goal
            </Button>
          </div>
        )}

        {goals.length === 0 && !showForm && (
          <div className="text-center py-4">
            <div className="text-4xl mb-2">🌟</div>
            <p className="text-xs text-muted-foreground">Dream together! Create a shared goal for the family.</p>
          </div>
        )}

        {goals.map(g => {
          const totalContrib = g.contributions.reduce((s, c) => s + c.amount, 0);
          const pct = g.targetAmount > 0 ? Math.min((totalContrib / g.targetAmount) * 100, 100) : 0;
          const byMember = g.contributions.reduce((acc, c) => {
            acc[c.memberName] = (acc[c.memberName] || 0) + c.amount;
            return acc;
          }, {} as Record<string, number>);

          return (
            <div key={g.id} className="rounded-xl bg-secondary/40 border border-border p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{g.emoji}</span>
                  <div>
                    <p className="text-xs font-bold text-foreground">{g.name}</p>
                    <p className="text-[10px] text-muted-foreground">{fmt(totalContrib)} of {fmt(g.targetAmount)}</p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-[10px]">{Math.round(pct)}%</Badge>
              </div>
              <Progress value={pct} className="h-2" />

              {Object.keys(byMember).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(byMember).map(([name, amt]) => (
                    <span key={name} className="text-[10px] bg-primary/10 text-primary rounded-full px-2 py-0.5">
                      {name}: {fmt(amt)}
                    </span>
                  ))}
                </div>
              )}

              {contribGoalId === g.id ? (
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2 items-center">
                    <Input placeholder="Amount" type="number" value={contribAmount} onChange={e => setContribAmount(e.target.value)} className="h-8 text-xs flex-1" />
                    <Select value={contribMember} onValueChange={setContribMember}>
                      <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="Who?" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={userName}>Me</SelectItem>
                        {members.map(m => (
                          <SelectItem key={m.id} value={m.name}>{m.emoji} {m.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="h-7 text-xs flex-1" onClick={() => handleContribute(g.id)} disabled={!contribAmount}>
                      Add Contribution
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setContribGoalId(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <Button variant="outline" size="sm" className="h-7 text-xs w-full" onClick={() => { setContribGoalId(g.id); setContribMember(userName); }}>
                  💪 Contribute
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default FamilyLandTab;
