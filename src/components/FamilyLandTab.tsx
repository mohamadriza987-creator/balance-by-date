import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Heart, Users, PiggyBank, Target, Plus, Check, X,
  Baby, UserPlus, Gift, ArrowRight, Sparkles, TreePine, Mail, AtSign, Send, Loader2, MessageCircle,
  LogOut, BellOff, Bell, Edit2, ChevronDown, ChevronUp, Mic, MicOff, Camera, Clock, Image as ImageIcon, Timer
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
import { useFamilyCircles, type FamilyCircle, type CircleMember } from "@/hooks/use-family-circles";

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

const RELATIONSHIP_LABELS: Record<string, string> = {
  spouse: "Spouse / Partner",
  child: "Child",
  parent: "Parent",
  sibling: "Sibling",
  self: "You",
  member: "Member",
};

const REL_EMOJI_MAP: Record<string, string> = {
  spouse: "💍",
  child: "🧒",
  parent: "🧓",
  sibling: "🤝",
  self: "🏠",
  member: "👤",
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
  const { user } = useAuth();

  const familyCircles = useFamilyCircles();

  const pendingRequests = family.requests.filter(r => r.status === "pending");

  const insights = useMemo(() => {
    const msgs: { text: string; emoji: string }[] = [];
    if (pendingInvitations.length > 0) {
      msgs.push({ text: `You have ${pendingInvitations.length} family invitation${pendingInvitations.length > 1 ? "s" : ""} waiting! 💌`, emoji: "📬" });
    }
    if (pendingRequests.length > 0) {
      msgs.push({ text: `You have ${pendingRequests.length} family request${pendingRequests.length > 1 ? "s" : ""} waiting for your attention.`, emoji: "📬" });
    }
    if (familyCircles.circles.length === 0 && pendingInvitations.length === 0) {
      msgs.push({ text: "Create your first Family Circle to connect with loved ones! 🌱", emoji: "👋" });
    }
    return msgs.slice(0, 3);
  }, [pendingRequests, pendingInvitations, familyCircles.circles]);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Welcome Banner */}
      <div className="finnyland-card p-4 finnyland-gradient">
        <div className="flex items-center gap-3">
          <div className="text-3xl">🏡</div>
          <div>
            <h2 className="text-base font-bold text-foreground">My Family Land</h2>
            <p className="text-xs text-muted-foreground">Your cozy corner for family circles, goals & coordination</p>
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
          familyCircles={familyCircles}
        />
      )}

      {/* Family Circles */}
      <FamilyCirclesSection familyCircles={familyCircles} />

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
function FamilyInvitationsSection({ invitations, onAddFamilyMember, onInvitationHandled, familyCircles }: {
  invitations: FamilyInvitation[];
  onAddFamilyMember: (m: Omit<FamilyMember, "id">) => void;
  onInvitationHandled?: () => void;
  familyCircles: ReturnType<typeof useFamilyCircles>;
}) {
  const { user } = useAuth();
  const [acting, setActing] = useState<string | null>(null);

  const handleAccept = async (inv: FamilyInvitation) => {
    if (!user) return;
    setActing(inv.id);

    const { data: result, error } = await supabase.rpc("accept_family_invitation", {
      invitation_id: inv.id,
    });

    if (error || (result as any)?.error) {
      toast.error("Failed to accept invitation");
      console.error("Accept error:", error || (result as any)?.error);
      setActing(null);
      return;
    }

    const res = result as any;
    const name = res.sender_name || "Family Member";
    const rel = res.relationship as FamilyRelationship;
    const emojis = RELATIONSHIP_EMOJIS[rel] || ["👤"];
    onAddFamilyMember({
      name,
      relationship: rel,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      linkedUserId: res.sender_user_id,
      linkedFinnyId: res.sender_finny_id || undefined,
      addedDate: todayStr(),
    });

    // Auto-add to first circle or create one
    if (familyCircles.circles.length > 0) {
      await familyCircles.addMemberToCircle(familyCircles.circles[0].id, res.sender_user_id, rel);
    } else {
      const circleId = await familyCircles.createCircle("My Family");
      if (circleId) {
        await familyCircles.addMemberToCircle(circleId, res.sender_user_id, rel);
      }
    }

    toast.success(`${name} has been added to your Family Circle! 🏡`);
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
          const senderName = [inv.from_first_name, inv.from_last_name].filter(Boolean).join(" ") || "Someone";
          const relLabel = RELATIONSHIP_LABELS[inv.relationship] || inv.relationship;
          const relEmoji = REL_EMOJI_MAP[inv.relationship] || "👤";
          return (
            <div key={inv.id} className="rounded-xl bg-background border border-primary/20 p-3 animate-slide-up-fade">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-lg">{relEmoji}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{senderName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Your <span className="font-medium capitalize text-foreground">{relLabel}</span>{" "}
                    <span className="font-medium text-primary">{senderName}</span> wants to join your Family Circle! 🏡
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Button size="sm" className="flex-1 rounded-xl text-xs" onClick={() => handleAccept(inv)} disabled={acting === inv.id}>
                  {acting === inv.id ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                  Accept
                </Button>
                <Button size="sm" variant="outline" className="flex-1 rounded-xl text-xs" onClick={() => handleDecline(inv)} disabled={acting === inv.id}>
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

// ─── Family Circles Section ──────────────────────────────────
function FamilyCirclesSection({ familyCircles }: {
  familyCircles: ReturnType<typeof useFamilyCircles>;
}) {
  const { user } = useAuth();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCircleName, setNewCircleName] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!newCircleName.trim()) return;
    setCreating(true);
    await familyCircles.createCircle(newCircleName.trim());
    setNewCircleName("");
    setShowCreateForm(false);
    setCreating(false);
  };

  return (
    <div className="space-y-4">
      {/* Create New Circle Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
          <Users className="h-4 w-4 text-primary" /> Family Circles
        </h3>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowCreateForm(!showCreateForm)}>
          <Plus className="h-3 w-3 mr-1" /> New Circle
        </Button>
      </div>

      {showCreateForm && (
        <div className="flex gap-2 items-center p-3 rounded-xl bg-primary/5 border border-primary/20">
          <Input
            placeholder="Circle name (e.g. The Smiths)"
            value={newCircleName}
            onChange={e => setNewCircleName(e.target.value)}
            className="h-9 text-sm flex-1"
            onKeyDown={e => e.key === "Enter" && handleCreate()}
          />
          <Button size="sm" className="h-9" onClick={handleCreate} disabled={!newCircleName.trim() || creating}>
            {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Create"}
          </Button>
        </div>
      )}

      {familyCircles.loading ? (
        <div className="text-center py-6">
          <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" />
          <p className="text-xs text-muted-foreground mt-2">Loading circles...</p>
        </div>
      ) : familyCircles.circles.length === 0 ? (
        <Card className="finnyland-card">
          <CardContent className="py-8 text-center">
            <div className="text-4xl mb-2">🌱</div>
            <p className="text-xs text-muted-foreground">No family circles yet. Create one to get started!</p>
          </CardContent>
        </Card>
      ) : (
        familyCircles.circles.map(circle => (
          <CircleCard key={circle.id} circle={circle} familyCircles={familyCircles} />
        ))
      )}
    </div>
  );
}

// ─── Individual Circle Card ──────────────────────────────────
function CircleCard({ circle, familyCircles }: {
  circle: FamilyCircle;
  familyCircles: ReturnType<typeof useFamilyCircles>;
}) {
  const { user } = useAuth();
  const [showChat, setShowChat] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(circle.name);
  const [messageText, setMessageText] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [lastSeenKey] = useState(`circle-seen-${circle.id}`);
  const [lastSeen, setLastSeen] = useState(() => localStorage.getItem(`circle-seen-${circle.id}`) || "");

  // Invite state
  const [identifier, setIdentifier] = useState("");
  const [relationship, setRelationship] = useState<string>("member");
  const [sending, setSending] = useState(false);
  const [lookupResult, setLookupResult] = useState<{
    status: "idle" | "searching" | "found" | "not_found" | "self";
    name?: string;
    finnyId?: string;
    userId?: string;
  }>({ status: "idle" });

  const circleMembers = familyCircles.getCircleMembers(circle.id);
  const circleMessages = familyCircles.getCircleMessages(circle.id);
  const isMuted = familyCircles.isMuted(circle.id);
  const hasNew = familyCircles.hasNewMessages(circle.id, lastSeen) && !isMuted;

  const otherMembers = circleMembers.filter(m => m.user_id !== user?.id);
  const parents = otherMembers.filter(m => m.relationship === "parent");
  const spouse = otherMembers.find(m => m.relationship === "spouse");
  const siblings = otherMembers.filter(m => m.relationship === "sibling");
  const children = otherMembers.filter(m => m.relationship === "child");
  const others = otherMembers.filter(m => !["parent", "spouse", "sibling", "child"].includes(m.relationship));

  // Mark as seen when chat opens
  useEffect(() => {
    if (showChat) {
      const now = new Date().toISOString();
      setLastSeen(now);
      localStorage.setItem(lastSeenKey, now);
    }
  }, [showChat, lastSeenKey]);

  // Debounced live lookup
  useEffect(() => {
    const val = identifier.trim().replace(/^@/, "");
    if (!val || val.length < 2) { setLookupResult({ status: "idle" }); return; }
    const isEmail = val.includes("@") && !val.startsWith("@");
    if (isEmail && !val.match(/.+@.+\..+/)) { setLookupResult({ status: "idle" }); return; }
    setLookupResult({ status: "searching" });

    const timer = setTimeout(async () => {
      try {
        if (isEmail) {
          if (user?.email === val) { setLookupResult({ status: "self" }); return; }
          const { data, error } = await supabase.rpc("lookup_user_by_email", { lookup_email: val });
          if (error || !data || data.length === 0) { setLookupResult({ status: "not_found" }); return; }
          const row = data[0];
          setLookupResult({ status: "found", name: [row.first_name, row.last_name].filter(Boolean).join(" ") || "User", finnyId: row.finny_user_id || undefined, userId: row.user_id });
        } else {
          const { data } = await supabase.from("profiles").select("user_id, first_name, last_name, finny_user_id").eq("finny_user_id", val).maybeSingle();
          if (!data) { setLookupResult({ status: "not_found" }); return; }
          if (data.user_id === user?.id) { setLookupResult({ status: "self" }); return; }
          setLookupResult({ status: "found", name: [data.first_name, data.last_name].filter(Boolean).join(" ") || "User", finnyId: data.finny_user_id || undefined, userId: data.user_id });
        }
      } catch { setLookupResult({ status: "idle" }); }
    }, 400);
    return () => clearTimeout(timer);
  }, [identifier, user]);

  const handleInvite = async () => {
    if (!user || lookupResult.status !== "found" || !lookupResult.userId) return;
    setSending(true);

    // Add to circle directly (they must already have an account)
    const success = await familyCircles.addMemberToCircle(circle.id, lookupResult.userId, relationship);
    if (success) {
      toast.success(`${lookupResult.name} added to "${circle.name}"! They'll see this circle automatically. 🎉`);
      setIdentifier("");
      setShowInvite(false);
    }
    setSending(false);
  };

  const handleSendMessage = async (options?: { messageType?: "text" | "voice" | "photo"; expiresInSeconds?: number; mediaUrl?: string }) => {
    const msgType = options?.messageType || "text";
    if (msgType === "text" && !messageText.trim()) return;
    setSendingMsg(true);
    const success = await familyCircles.sendMessage(circle.id, messageText, options);
    if (success) {
      setMessageText("");
    }
    setSendingMsg(false);
  };

  const handleRename = async () => {
    if (!newName.trim() || newName === circle.name) { setEditingName(false); return; }
    await familyCircles.renameCircle(circle.id, newName.trim());
    setEditingName(false);
  };

  const getMemberName = (m: CircleMember) => {
    return [m.first_name, m.last_name].filter(Boolean).join(" ") || "Member";
  };

  return (
    <Card className="finnyland-card overflow-hidden">
      <CardHeader className="pb-2 px-4 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {editingName ? (
              <div className="flex items-center gap-1.5 flex-1">
                <Input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="h-7 text-sm flex-1"
                  onKeyDown={e => e.key === "Enter" && handleRename()}
                  autoFocus
                />
                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={handleRename}>
                  <Check className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <CardTitle className="text-sm font-bold flex items-center gap-2 truncate">
                <Users className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate">{circle.name}</span>
                <Badge variant="secondary" className="text-[10px] shrink-0">{circleMembers.length}</Badge>
              </CardTitle>
            )}
          </div>
          <div className="flex items-center gap-1">
            {/* Chat bubble - blinks green on new message */}
            <button
              onClick={() => setShowChat(!showChat)}
              className={`relative rounded-full p-1.5 transition-all ${showChat ? "bg-primary/20" : "hover:bg-secondary"}`}
            >
              <MessageCircle className={`h-4 w-4 ${showChat ? "text-primary" : "text-muted-foreground"}`} />
              {hasNew && !showChat && (
                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 family-notify-dot" />
              )}
            </button>

            {/* Menu */}
            <div className="relative">
              <button onClick={() => setShowMenu(!showMenu)} className="rounded-full p-1.5 hover:bg-secondary transition-colors">
                <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${showMenu ? "rotate-180" : ""}`} />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-8 z-20 bg-background border border-border rounded-xl shadow-lg p-1.5 min-w-[140px] animate-fade-in">
                  <button onClick={() => { setEditingName(true); setShowMenu(false); }} className="flex items-center gap-2 w-full px-3 py-2 text-xs rounded-lg hover:bg-secondary transition-colors text-foreground">
                    <Edit2 className="h-3 w-3" /> Rename
                  </button>
                  <button onClick={() => { setShowInvite(!showInvite); setShowMenu(false); }} className="flex items-center gap-2 w-full px-3 py-2 text-xs rounded-lg hover:bg-secondary transition-colors text-foreground">
                    <UserPlus className="h-3 w-3" /> Invite
                  </button>
                  <button onClick={() => { familyCircles.toggleMute(circle.id); setShowMenu(false); }} className="flex items-center gap-2 w-full px-3 py-2 text-xs rounded-lg hover:bg-secondary transition-colors text-foreground">
                    {isMuted ? <Bell className="h-3 w-3" /> : <BellOff className="h-3 w-3" />}
                    {isMuted ? "Unmute" : "Mute"}
                  </button>
                  <div className="border-t border-border my-1" />
                  <button
                    onClick={() => {
                      if (confirm("Are you sure you want to leave this circle?")) {
                        familyCircles.leaveCircle(circle.id);
                      }
                      setShowMenu(false);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs rounded-lg hover:bg-destructive/10 transition-colors text-destructive"
                  >
                    <LogOut className="h-3 w-3" /> Leave Circle
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4">
        {/* Invite Form */}
        {showInvite && (
          <div className="flex flex-col gap-2.5 mb-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
            <p className="text-xs text-muted-foreground">Add by <span className="font-medium text-foreground">Username</span> or <span className="font-medium text-foreground">Email</span></p>
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
            {lookupResult.status === "searching" && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground px-1"><Loader2 className="h-3 w-3 animate-spin" /> Looking up user...</div>
            )}
            {lookupResult.status === "found" && (
              <div className="flex items-center gap-2 text-xs text-primary bg-primary/10 rounded-lg px-3 py-2 border border-primary/20">
                <Check className="h-3.5 w-3.5 shrink-0" /> <span className="font-medium">{lookupResult.name}</span>
              </div>
            )}
            {lookupResult.status === "not_found" && (
              <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2 border border-destructive/20">
                <X className="h-3.5 w-3.5 shrink-0" /> <span>User not found</span>
              </div>
            )}
            {lookupResult.status === "self" && (
              <div className="flex items-center gap-2 text-xs bg-accent/10 rounded-lg px-3 py-2 border border-accent/20">
                <span>😄</span> <span>That's you!</span>
              </div>
            )}
            <Select value={relationship} onValueChange={setRelationship}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="spouse">💍 Spouse / Partner</SelectItem>
                <SelectItem value="parent">🧓 Parent</SelectItem>
                <SelectItem value="sibling">🤝 Sibling</SelectItem>
                <SelectItem value="child">🧒 Child</SelectItem>
                <SelectItem value="member">👤 Member</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" className="h-8 text-xs" onClick={handleInvite} disabled={lookupResult.status !== "found" || sending}>
              {sending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <UserPlus className="h-3.5 w-3.5 mr-1" />}
              Add to Circle
            </Button>
          </div>
        )}

        {/* Family Tree */}
        {circleMembers.length <= 1 ? (
          <div className="text-center py-4">
            <div className="text-4xl mb-2">🌱</div>
            <p className="text-xs text-muted-foreground">This circle is empty. Invite someone to get started!</p>
            {!showInvite && (
              <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={() => setShowInvite(true)}>
                <UserPlus className="h-3 w-3 mr-1" /> Invite
              </Button>
            )}
          </div>
        ) : (
          <FamilyTreeView
            parents={parents}
            spouse={spouse}
            siblings={siblings}
            children={children}
            others={others}
            currentUserId={user?.id}
            getMemberName={getMemberName}
          />
        )}

        {/* Chat Section */}
        {showChat && (
          <CircleChatBox
            circleId={circle.id}
            messages={circleMessages}
            currentUserId={user?.id}
            messageText={messageText}
            setMessageText={setMessageText}
            onSend={handleSendMessage}
            sending={sendingMsg}
          />
        )}
      </CardContent>
    </Card>
  );
}

// ─── Family Tree View ────────────────────────────────────────
function MemberBubble({ name, emoji, relationship }: {
  name: string;
  emoji: string;
  relationship: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="w-14 h-14 rounded-full flex items-center justify-center border-2 border-primary/30 bg-primary/5 shadow-sm hover:scale-105 transition-transform">
        <div className="text-center">
          <span className="text-base block leading-none">{emoji}</span>
          <span className="text-[8px] font-bold text-foreground leading-tight block mt-0.5 max-w-[44px] truncate">{name.split(" ")[0]}</span>
        </div>
      </div>
      <span className="text-[8px] text-muted-foreground capitalize font-medium">{relationship}</span>
    </div>
  );
}

function FamilyTreeView({ parents, spouse, siblings, children, others, currentUserId, getMemberName }: {
  parents: CircleMember[];
  spouse?: CircleMember;
  siblings: CircleMember[];
  children: CircleMember[];
  others: CircleMember[];
  currentUserId?: string;
  getMemberName: (m: CircleMember) => string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-3 mb-2">
      {/* Parents Row */}
      {parents.length > 0 && (
        <>
          <div className="flex items-center gap-5 justify-center">
            {parents.map(p => (
              <MemberBubble key={p.id} name={getMemberName(p)} emoji="🧓" relationship="parent" />
            ))}
          </div>
          <div className="w-px h-3 bg-border" />
        </>
      )}

      {/* Me + Spouse Row */}
      <div className="flex items-center gap-3 justify-center">
        <div className="flex flex-col items-center gap-1">
          <div className="w-14 h-14 rounded-full flex items-center justify-center border-2 border-primary bg-primary/15 shadow-lg shadow-primary/20">
            <div className="text-center">
              <span className="text-base block leading-none">🏠</span>
              <span className="text-[8px] font-bold text-foreground leading-tight block mt-0.5">Me</span>
            </div>
          </div>
          <span className="text-[8px] text-primary font-semibold">You</span>
        </div>
        {spouse && (
          <>
            <div className="flex items-center gap-0.5">
              <div className="w-3 h-px bg-primary/40" />
              <Heart className="h-3 w-3 text-primary fill-primary/30" />
              <div className="w-3 h-px bg-primary/40" />
            </div>
            <MemberBubble name={getMemberName(spouse)} emoji="💍" relationship="spouse" />
          </>
        )}
      </div>

      {/* Siblings */}
      {siblings.length > 0 && (
        <>
          <div className="w-px h-2 bg-border" />
          <div className="flex items-start gap-4 justify-center">
            {siblings.map((s, i) => (
              <div key={s.id} style={{ marginTop: `${i * 4}px` }}>
                <MemberBubble name={getMemberName(s)} emoji="🤝" relationship="sibling" />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Children */}
      {children.length > 0 && (
        <>
          <div className="w-px h-2 bg-border" />
          <div className="flex items-center gap-4 justify-center">
            {children.map(c => (
              <MemberBubble key={c.id} name={getMemberName(c)} emoji="🧒" relationship="child" />
            ))}
          </div>
        </>
      )}

      {/* Other members */}
      {others.length > 0 && (
        <>
          <div className="w-px h-2 bg-border" />
          <div className="flex items-center gap-4 justify-center flex-wrap">
            {others.map(m => (
              <MemberBubble key={m.id} name={getMemberName(m)} emoji="👤" relationship={m.relationship} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Circle Chat Box ─────────────────────────────────────────
function CircleChatBox({ circleId, messages, currentUserId, messageText, setMessageText, onSend, sending }: {
  circleId: string;
  messages: Array<{ id: string; sender_user_id: string; sender_name: string; message: string; created_at: string }>;
  currentUserId?: string;
  messageText: string;
  setMessageText: (v: string) => void;
  onSend: () => void;
  sending: boolean;
}) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  return (
    <div className="border-t border-border pt-3 mt-3 space-y-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
        <MessageCircle className="h-3 w-3" /> Circle Chat
      </p>

      {/* Messages */}
      <div className="max-h-48 overflow-y-auto space-y-2">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-3">No messages yet. Say hello! 👋</p>
        )}
        {[...messages].reverse().map(msg => {
          const isMe = msg.sender_user_id === currentUserId;
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%]`}>
                <div className={`px-3 py-2 rounded-xl text-xs ${
                  isMe
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-secondary border border-border rounded-bl-sm"
                }`}>
                  {!isMe && <p className="font-semibold text-[10px] mb-0.5 text-primary">{msg.sender_name}</p>}
                  <p>{msg.message}</p>
                </div>
                <p className="text-[9px] text-muted-foreground mt-0.5 px-1">{getTimeAgo(msg.created_at)}</p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <Input
          placeholder="Type a message..."
          value={messageText}
          onChange={e => setMessageText(e.target.value)}
          className="h-9 text-sm flex-1"
          onKeyDown={e => e.key === "Enter" && onSend()}
        />
        <Button size="sm" className="h-9 px-3" onClick={onSend} disabled={!messageText.trim() || sending}>
          {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
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
                      {fmt(r.amount)} {member ? `→ ${member.emoji} ${member.name}` : ""}
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
                  {Object.entries(byMember).map(([memberName, amt]) => (
                    <span key={memberName} className="text-[10px] bg-primary/10 text-primary rounded-full px-2 py-0.5">
                      {memberName}: {fmt(amt)}
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
