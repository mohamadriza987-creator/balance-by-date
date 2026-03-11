import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { useFamilyCircles, type FamilyCircle, type CircleMember, type CircleInvitation } from "@/hooks/use-family-circles";

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
  spouse: "Spouse / Partner", child: "Child", parent: "Parent",
  sibling: "Sibling", self: "You", member: "Member",
};

const REL_EMOJI_MAP: Record<string, string> = {
  spouse: "💍", child: "🧒", parent: "🧓", sibling: "🤝", self: "🏠", member: "👤",
};

const todayStr = () => new Date().toISOString().slice(0, 10);

export function FamilyLandTab({
  data, onAddFamilyMember, onRemoveFamilyMember,
  onAddFamilyRequest, onUpdateFamilyRequest,
  onAddPiggyBank, onAddPiggyBankContribution, onRemovePiggyBank,
  onAddSharedGoal, onAddSharedGoalContribution, onRemoveSharedGoal,
  pendingInvitations = [], onInvitationHandled,
}: FamilyLandTabProps) {
  const family = data.familyData || { members: [], requests: [], piggyBanks: [], sharedGoals: [] };
  const cs = data.userProfile?.currencySymbol || "$";
  const fmt = (n: number) => formatMoney(n, data.userProfile);
  const { user } = useAuth();
  const familyCircles = useFamilyCircles();
  const pendingRequests = family.requests.filter(r => r.status === "pending");

  const insights = useMemo(() => {
    const msgs: { text: string; emoji: string }[] = [];
    if (pendingInvitations.length > 0) msgs.push({ text: `You have ${pendingInvitations.length} family invitation${pendingInvitations.length > 1 ? "s" : ""} waiting! 💌`, emoji: "📬" });
    if (familyCircles.pendingCircleInvites.length > 0) msgs.push({ text: `You have ${familyCircles.pendingCircleInvites.length} circle invitation${familyCircles.pendingCircleInvites.length > 1 ? "s" : ""} pending!`, emoji: "🏡" });
    if (pendingRequests.length > 0) msgs.push({ text: `You have ${pendingRequests.length} family request${pendingRequests.length > 1 ? "s" : ""} waiting for your attention.`, emoji: "📬" });
    if (familyCircles.circles.length === 0 && pendingInvitations.length === 0) msgs.push({ text: "Create your first Family Circle to connect with loved ones! 🌱", emoji: "👋" });
    return msgs.slice(0, 3);
  }, [pendingRequests, pendingInvitations, familyCircles.circles, familyCircles.pendingCircleInvites]);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Welcome Banner */}
      <div className="finnyland-card p-4 finnyland-gradient relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 pointer-events-none" />
        <div className="flex items-center gap-3 relative">
          <div className="text-3xl animate-float">🏡</div>
          <div>
            <h2 className="text-base font-bold text-foreground">My Family Land</h2>
            <p className="text-xs text-muted-foreground">Your cozy corner for family circles, goals & coordination</p>
          </div>
        </div>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="space-y-2">
          {insights.map((msg, i) => (
            <div key={i} className="flex items-start gap-2.5 rounded-xl bg-accent/10 border border-accent/20 px-3 py-2.5 animate-slide-up" style={{ animationDelay: `${i * 80}ms` }}>
              <span className="text-lg flex-shrink-0">{msg.emoji}</span>
              <p className="text-xs text-foreground/80 leading-relaxed">{msg.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* Pending Family Invitations */}
      {pendingInvitations.length > 0 && (
        <FamilyInvitationsSection invitations={pendingInvitations} onAddFamilyMember={onAddFamilyMember} onInvitationHandled={onInvitationHandled} familyCircles={familyCircles} />
      )}

      {/* Pending Circle Invitations */}
      {familyCircles.pendingCircleInvites.length > 0 && (
        <CircleInvitationsSection invites={familyCircles.pendingCircleInvites} onAccept={familyCircles.acceptCircleInvite} onDecline={familyCircles.declineCircleInvite} />
      )}

      {/* Family Circles */}
      <FamilyCirclesSection familyCircles={familyCircles} />

      {/* Family Requests */}
      <FamilyRequestsSection requests={family.requests} members={family.members} onAdd={onAddFamilyRequest} onUpdate={onUpdateFamilyRequest} userName={data.userProfile?.name || "Me"} cs={cs} fmt={fmt} />

      {/* Piggy Banks */}
      <PiggyBanksSection piggyBanks={family.piggyBanks} members={family.members} onAdd={onAddPiggyBank} onContribute={onAddPiggyBankContribution} onRemove={onRemovePiggyBank} userName={data.userProfile?.name || "Me"} cs={cs} fmt={fmt} />

      {/* Shared Goals */}
      <SharedGoalsSection goals={family.sharedGoals} members={family.members} onAdd={onAddSharedGoal} onContribute={onAddSharedGoalContribution} onRemove={onRemoveSharedGoal} userName={data.userProfile?.name || "Me"} cs={cs} fmt={fmt} />
    </div>
  );
}

// ─── Circle Invitations (Accept/Decline) ─────────────────────
function CircleInvitationsSection({ invites, onAccept, onDecline }: {
  invites: CircleInvitation[];
  onAccept: (id: string) => Promise<boolean>;
  onDecline: (id: string) => Promise<void>;
}) {
  const [acting, setActing] = useState<string | null>(null);

  return (
    <Card className="border-2 border-accent/30 bg-accent/5 finnyland-card">
      <CardHeader className="pb-2 px-4 pt-4">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <Users className="h-4 w-4 text-accent animate-pulse" /> Circle Invitations
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {invites.map(inv => (
          <div key={inv.id} className="rounded-xl bg-background border border-accent/20 p-3 animate-slide-up">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0 text-lg">🏡</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{inv.from_name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  invited you to join <span className="font-medium text-foreground">"{inv.circle_name}"</span> as{" "}
                  <span className="font-medium capitalize text-accent">{RELATIONSHIP_LABELS[inv.relationship] || inv.relationship}</span>
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button size="sm" className="flex-1 rounded-xl text-xs" onClick={async () => { setActing(inv.id); await onAccept(inv.id); setActing(null); }} disabled={acting === inv.id}>
                {acting === inv.id ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                Join Circle
              </Button>
              <Button size="sm" variant="outline" className="flex-1 rounded-xl text-xs" onClick={async () => { setActing(inv.id); await onDecline(inv.id); setActing(null); }} disabled={acting === inv.id}>
                <X className="h-3.5 w-3.5 mr-1" /> Decline
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
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
    const { data: result, error } = await supabase.rpc("accept_family_invitation", { invitation_id: inv.id });
    if (error || (result as any)?.error) { toast.error("Failed to accept invitation"); setActing(null); return; }
    const res = result as any;
    const name = res.sender_name || "Family Member";
    const rel = res.relationship as FamilyRelationship;
    const emojis = RELATIONSHIP_EMOJIS[rel] || ["👤"];
    onAddFamilyMember({ name, relationship: rel, emoji: emojis[Math.floor(Math.random() * emojis.length)], linkedUserId: res.sender_user_id, linkedFinnyId: res.sender_finny_id || undefined, addedDate: todayStr() });
    if (familyCircles.circles.length > 0) await familyCircles.addMemberToCircle(familyCircles.circles[0].id, res.sender_user_id, rel);
    else { const circleId = await familyCircles.createCircle("My Family"); if (circleId) await familyCircles.addMemberToCircle(circleId, res.sender_user_id, rel); }
    toast.success(`${name} has been added to your Family Circle! 🏡`);
    setActing(null);
    onInvitationHandled?.();
  };

  const handleDecline = async (inv: FamilyInvitation) => {
    setActing(inv.id);
    await supabase.from("family_invitations").update({ status: "declined" } as any).eq("id", inv.id);
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
            <div key={inv.id} className="rounded-xl bg-background border border-primary/20 p-3 animate-slide-up">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-lg">{relEmoji}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{senderName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    wants to add you as <span className="font-medium capitalize text-foreground">{relLabel}</span>
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Button size="sm" className="flex-1 rounded-xl text-xs" onClick={() => handleAccept(inv)} disabled={acting === inv.id}>
                  {acting === inv.id ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />} Accept
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
function FamilyCirclesSection({ familyCircles }: { familyCircles: ReturnType<typeof useFamilyCircles> }) {
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
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
          <Users className="h-4 w-4 text-primary" /> Family Circles
        </h3>
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 hover:bg-primary/10 hover:text-primary transition-all" onClick={() => setShowCreateForm(!showCreateForm)}>
          <Plus className="h-3 w-3" /> New Circle
        </Button>
      </div>

      {showCreateForm && (
        <div className="flex gap-2 items-center p-3 rounded-xl bg-primary/5 border border-primary/20 animate-slide-up">
          <Input placeholder="Circle name (e.g. The Smiths)" value={newCircleName} onChange={e => setNewCircleName(e.target.value)} className="h-9 text-sm flex-1" onKeyDown={e => e.key === "Enter" && handleCreate()} autoFocus />
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
            <div className="text-4xl mb-2 animate-float">🌱</div>
            <p className="text-xs text-muted-foreground">No family circles yet. Create one to get started!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {familyCircles.circles.map((circle, i) => (
            <div key={circle.id} className="animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
              <CircleCard circle={circle} familyCircles={familyCircles} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Individual Circle Card ──────────────────────────────────
function CircleCard({ circle, familyCircles }: { circle: FamilyCircle; familyCircles: ReturnType<typeof useFamilyCircles> }) {
  const { user } = useAuth();
  const [showChat, setShowChat] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(circle.name);
  const [lastSeen, setLastSeen] = useState(() => localStorage.getItem(`circle-seen-${circle.id}`) || "");

  // Invite state
  const [identifier, setIdentifier] = useState("");
  const [relationship, setRelationship] = useState<string>("member");
  const [sending, setSending] = useState(false);
  const [lookupResult, setLookupResult] = useState<{ status: "idle" | "searching" | "found" | "not_found" | "self"; name?: string; userId?: string }>({ status: "idle" });

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

  useEffect(() => {
    if (showChat) {
      const now = new Date().toISOString();
      setLastSeen(now);
      localStorage.setItem(`circle-seen-${circle.id}`, now);
    }
  }, [showChat, circle.id]);

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
          setLookupResult({ status: "found", name: [data[0].first_name, data[0].last_name].filter(Boolean).join(" ") || "User", userId: data[0].user_id });
        } else {
          const { data } = await supabase.from("profiles").select("user_id, first_name, last_name, finny_user_id").eq("finny_user_id", val).maybeSingle();
          if (!data) { setLookupResult({ status: "not_found" }); return; }
          if (data.user_id === user?.id) { setLookupResult({ status: "self" }); return; }
          setLookupResult({ status: "found", name: [data.first_name, data.last_name].filter(Boolean).join(" ") || "User", userId: data.user_id });
        }
      } catch { setLookupResult({ status: "idle" }); }
    }, 400);
    return () => clearTimeout(timer);
  }, [identifier, user]);

  const handleInvite = async () => {
    if (!user || lookupResult.status !== "found" || !lookupResult.userId) return;
    setSending(true);
    await familyCircles.inviteToCircle(circle.id, lookupResult.userId, relationship);
    setIdentifier("");
    setShowInvite(false);
    setLookupResult({ status: "idle" });
    setSending(false);
  };

  const handleRename = async () => {
    if (!newName.trim() || newName === circle.name) { setEditingName(false); return; }
    await familyCircles.renameCircle(circle.id, newName.trim());
    setEditingName(false);
  };

  const getMemberName = (m: CircleMember) => [m.first_name, m.last_name].filter(Boolean).join(" ") || "Member";

  return (
    <Card className="finnyland-card overflow-hidden border-border/50 hover:border-primary/20 transition-colors duration-300">
      <CardHeader className="pb-2 px-4 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {editingName ? (
              <div className="flex items-center gap-1.5 flex-1">
                <Input value={newName} onChange={e => setNewName(e.target.value)} className="h-7 text-sm flex-1" onKeyDown={e => e.key === "Enter" && handleRename()} autoFocus />
                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={handleRename}><Check className="h-3 w-3" /></Button>
              </div>
            ) : (
              <CardTitle className="text-sm font-bold flex items-center gap-2 truncate">
                <Users className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate">{circle.name}</span>
                <Badge variant="secondary" className="text-[10px] shrink-0 bg-primary/10 text-primary border-0">{circleMembers.length} 👤</Badge>
              </CardTitle>
            )}
          </div>
          <div className="flex items-center gap-1">
            {/* Chat bubble */}
            <button
              onClick={() => setShowChat(!showChat)}
              className={`relative rounded-full p-2 transition-all duration-200 ${showChat ? "bg-primary/20 scale-110" : "hover:bg-secondary hover:scale-105"}`}
            >
              <MessageCircle className={`h-4 w-4 transition-colors ${showChat ? "text-primary" : "text-muted-foreground"}`} />
              {hasNew && !showChat && (
                <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 family-notify-dot shadow-lg shadow-green-500/50" />
              )}
            </button>

            {/* Menu */}
            <div className="relative">
              <button onClick={() => setShowMenu(!showMenu)} className="rounded-full p-2 hover:bg-secondary transition-all duration-200">
                <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${showMenu ? "rotate-180" : ""}`} />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-9 z-20 bg-background border border-border rounded-xl shadow-xl p-1.5 min-w-[150px] animate-slide-up">
                  <button onClick={() => { setEditingName(true); setShowMenu(false); }} className="flex items-center gap-2 w-full px-3 py-2 text-xs rounded-lg hover:bg-secondary transition-colors text-foreground">
                    <Edit2 className="h-3 w-3" /> Rename
                  </button>
                  <button onClick={() => { setShowInvite(!showInvite); setShowMenu(false); }} className="flex items-center gap-2 w-full px-3 py-2 text-xs rounded-lg hover:bg-secondary transition-colors text-foreground">
                    <UserPlus className="h-3 w-3" /> Invite Member
                  </button>
                  <button onClick={() => { familyCircles.toggleMute(circle.id); setShowMenu(false); }} className="flex items-center gap-2 w-full px-3 py-2 text-xs rounded-lg hover:bg-secondary transition-colors text-foreground">
                    {isMuted ? <Bell className="h-3 w-3" /> : <BellOff className="h-3 w-3" />}
                    {isMuted ? "Unmute" : "Mute"}
                  </button>
                  <div className="border-t border-border my-1" />
                  <button
                    onClick={() => { if (confirm("Are you sure you want to leave this circle?")) familyCircles.leaveCircle(circle.id); setShowMenu(false); }}
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
          <div className="flex flex-col gap-2.5 mb-3 p-3 rounded-xl bg-primary/5 border border-primary/20 animate-slide-up">
            <p className="text-xs text-muted-foreground">Invite by <span className="font-medium text-foreground">Username</span> or <span className="font-medium text-foreground">Email</span></p>
            <div className="relative">
              <Input placeholder="@username or email@example.com" value={identifier} onChange={e => setIdentifier(e.target.value)} className="h-9 text-sm pl-8" />
              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                {identifier.includes("@") && !identifier.startsWith("@") ? <Mail className="h-3.5 w-3.5" /> : <AtSign className="h-3.5 w-3.5" />}
              </div>
            </div>
            {lookupResult.status === "searching" && <div className="flex items-center gap-2 text-xs text-muted-foreground px-1"><Loader2 className="h-3 w-3 animate-spin" /> Looking up user...</div>}
            {lookupResult.status === "found" && (
              <div className="flex items-center gap-2 text-xs text-primary bg-primary/10 rounded-lg px-3 py-2 border border-primary/20 animate-slide-up">
                <Check className="h-3.5 w-3.5 shrink-0" /> <span className="font-medium">{lookupResult.name}</span>
              </div>
            )}
            {lookupResult.status === "not_found" && (
              <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2 border border-destructive/20"><X className="h-3.5 w-3.5 shrink-0" /> User not found</div>
            )}
            {lookupResult.status === "self" && (
              <div className="flex items-center gap-2 text-xs bg-accent/10 rounded-lg px-3 py-2 border border-accent/20"><span>😄</span> That's you!</div>
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
            <Button size="sm" className="h-8 text-xs rounded-xl" onClick={handleInvite} disabled={lookupResult.status !== "found" || sending}>
              {sending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1" />}
              Send Invitation
            </Button>
          </div>
        )}

        {/* Family Tree */}
        {circleMembers.length <= 1 ? (
          <div className="text-center py-4">
            <div className="text-4xl mb-2 animate-float">🌱</div>
            <p className="text-xs text-muted-foreground">This circle is empty. Invite someone to get started!</p>
            {!showInvite && (
              <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={() => setShowInvite(true)}>
                <UserPlus className="h-3 w-3 mr-1" /> Invite
              </Button>
            )}
          </div>
        ) : (
          <FamilyTreeView parents={parents} spouse={spouse} siblings={siblings} children={children} others={others} currentUserId={user?.id} getMemberName={getMemberName} />
        )}

        {/* Chat */}
        {showChat && (
          <CircleChatBox
            circleId={circle.id}
            messages={circleMessages}
            currentUserId={user?.id}
            familyCircles={familyCircles}
          />
        )}
      </CardContent>
    </Card>
  );
}

// ─── Member Bubble ───────────────────────────────────────────
function MemberBubble({ name, emoji, relationship }: { name: string; emoji: string; relationship: string }) {
  return (
    <div className="flex flex-col items-center gap-1 group">
      <div className="w-14 h-14 rounded-full flex items-center justify-center border-2 border-primary/30 bg-primary/5 shadow-sm group-hover:scale-110 group-hover:shadow-md group-hover:border-primary/50 transition-all duration-300">
        <div className="text-center">
          <span className="text-base block leading-none">{emoji}</span>
          <span className="text-[8px] font-bold text-foreground leading-tight block mt-0.5 max-w-[44px] truncate">{name.split(" ")[0]}</span>
        </div>
      </div>
      <span className="text-[8px] text-muted-foreground capitalize font-medium">{relationship}</span>
    </div>
  );
}

// ─── Family Tree View ────────────────────────────────────────
function FamilyTreeView({ parents, spouse, siblings, children, others, currentUserId, getMemberName }: {
  parents: CircleMember[]; spouse?: CircleMember; siblings: CircleMember[]; children: CircleMember[]; others: CircleMember[];
  currentUserId?: string; getMemberName: (m: CircleMember) => string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-3 mb-2">
      {parents.length > 0 && (
        <>
          <div className="flex items-center gap-5 justify-center">
            {parents.map(p => <MemberBubble key={p.id} name={getMemberName(p)} emoji="🧓" relationship="parent" />)}
          </div>
          <div className="w-px h-3 bg-gradient-to-b from-border to-primary/20" />
        </>
      )}

      <div className="flex items-center gap-3 justify-center">
        <div className="flex flex-col items-center gap-1">
          <div className="w-14 h-14 rounded-full flex items-center justify-center border-2 border-primary bg-primary/15 shadow-lg shadow-primary/20 animate-pulse-subtle">
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
              <div className="w-4 h-px bg-gradient-to-r from-primary/40 to-primary/60" />
              <Heart className="h-3.5 w-3.5 text-primary fill-primary/30 animate-pulse" />
              <div className="w-4 h-px bg-gradient-to-r from-primary/60 to-primary/40" />
            </div>
            <MemberBubble name={getMemberName(spouse)} emoji="💍" relationship="spouse" />
          </>
        )}
      </div>

      {siblings.length > 0 && (
        <>
          <div className="w-px h-2 bg-gradient-to-b from-primary/20 to-border" />
          <div className="flex items-start gap-4 justify-center">
            {siblings.map((s, i) => (
              <div key={s.id} style={{ animationDelay: `${i * 100}ms` }} className="animate-slide-up">
                <MemberBubble name={getMemberName(s)} emoji="🤝" relationship="sibling" />
              </div>
            ))}
          </div>
        </>
      )}

      {children.length > 0 && (
        <>
          <div className="w-px h-2 bg-gradient-to-b from-border to-primary/20" />
          <div className="flex items-center gap-4 justify-center">
            {children.map((c, i) => (
              <div key={c.id} style={{ animationDelay: `${i * 100}ms` }} className="animate-slide-up">
                <MemberBubble name={getMemberName(c)} emoji="🧒" relationship="child" />
              </div>
            ))}
          </div>
        </>
      )}

      {others.length > 0 && (
        <>
          <div className="w-px h-2 bg-border" />
          <div className="flex items-center gap-4 justify-center flex-wrap">
            {others.map(m => <MemberBubble key={m.id} name={getMemberName(m)} emoji="👤" relationship={m.relationship} />)}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Circle Chat Box ─────────────────────────────────────────
const DISAPPEAR_OPTIONS = [
  { label: "10s", seconds: 10 },
  { label: "20s", seconds: 20 },
  { label: "30s", seconds: 30 },
  { label: "1m", seconds: 60 },
];

function CircleChatBox({ circleId, messages, currentUserId, familyCircles }: {
  circleId: string;
  messages: Array<{ id: string; sender_user_id: string; sender_name: string; message: string; created_at: string; message_type?: string; expires_at?: string | null; media_url?: string | null }>;
  currentUserId?: string;
  familyCircles: ReturnType<typeof useFamilyCircles>;
}) {
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [messageText, setMessageText] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [disappearTimer, setDisappearTimer] = useState<number | null>(null);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll to bottom within the chat container only
  const scrollToBottom = useCallback(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages.length, scrollToBottom]);

  const now = new Date().toISOString();
  const visibleMessages = messages.filter(m => !m.expires_at || m.expires_at > now);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks, { type: "audio/webm" });
        setUploadingMedia(true);
        const url = await familyCircles.uploadMedia(blob, "webm");
        if (url) await familyCircles.sendMessage(circleId, "", { messageType: "voice", expiresInSeconds: 1800, mediaUrl: url });
        setUploadingMedia(false);
        setRecording(false);
        setRecordingDuration(0);
        if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      };
      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
      setRecordingDuration(0);
      recordingIntervalRef.current = setInterval(() => setRecordingDuration(d => d + 1), 1000);
    } catch {
      toast.error("Microphone access denied");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();
    if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMedia(true);
    const ext = file.name.split(".").pop() || "jpg";
    const url = await familyCircles.uploadMedia(file, ext);
    if (url) await familyCircles.sendMessage(circleId, "", { messageType: "photo", expiresInSeconds: 1800, mediaUrl: url });
    setUploadingMedia(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleTextSend = async () => {
    if (!messageText.trim()) return;
    setSendingMsg(true);
    const success = await familyCircles.sendMessage(circleId, messageText, disappearTimer ? { expiresInSeconds: disappearTimer } : undefined);
    if (success) setMessageText("");
    setSendingMsg(false);
  };

  const getExpiryLabel = (expiresAt: string) => {
    const remaining = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
    if (remaining <= 0) return "expired";
    if (remaining < 60) return `${remaining}s`;
    return `${Math.floor(remaining / 60)}m`;
  };

  return (
    <div className="border-t border-border pt-3 mt-3 space-y-2.5 animate-slide-up">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
        <MessageCircle className="h-3 w-3 text-primary" /> Circle Chat
      </p>

      {/* Messages - scroll within container, not page */}
      <div ref={chatContainerRef} className="max-h-52 overflow-y-auto space-y-2 rounded-xl bg-secondary/20 p-2.5 border border-border/50">
        {visibleMessages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">No messages yet. Say hello! 👋</p>
        )}
        {[...visibleMessages].reverse().map((msg, i) => {
          const isMe = msg.sender_user_id === currentUserId;
          const isVoice = msg.message_type === "voice";
          const isPhoto = msg.message_type === "photo";
          const isExpiring = !!msg.expires_at;

          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`} style={{ animationDelay: `${i * 30}ms` }}>
              <div className="max-w-[80%]">
                <div className={`px-3 py-2 rounded-2xl text-xs shadow-sm transition-all ${
                  isMe
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-background border border-border rounded-bl-md"
                } ${isExpiring ? "ring-1 ring-dashed ring-primary/30" : ""}`}>
                  {!isMe && <p className="font-semibold text-[10px] mb-0.5 text-primary">{msg.sender_name}</p>}

                  {isVoice && msg.media_url ? (
                    <div className="flex items-center gap-2">
                      <Mic className="h-3 w-3 shrink-0" />
                      <audio controls src={msg.media_url} className="h-8 max-w-[200px]" />
                    </div>
                  ) : isPhoto && msg.media_url ? (
                    <img src={msg.media_url} alt="Photo" className="rounded-lg max-w-[200px] max-h-[150px] object-cover cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.open(msg.media_url!, "_blank")} />
                  ) : (
                    <p className="leading-relaxed">{msg.message}</p>
                  )}

                  {isExpiring && msg.expires_at && (
                    <div className="flex items-center gap-1 mt-1 opacity-60">
                      <Timer className="h-2.5 w-2.5" />
                      <span className="text-[9px]">{getExpiryLabel(msg.expires_at)}</span>
                    </div>
                  )}
                </div>
                <p className="text-[9px] text-muted-foreground mt-0.5 px-1">{getTimeAgo(msg.created_at)}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Disappearing timer */}
      <div className="flex items-center gap-1 flex-wrap">
        <button
          onClick={() => setDisappearTimer(disappearTimer ? null : 10)}
          className={`flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-full border transition-all duration-200 ${
            disappearTimer ? "bg-primary/10 border-primary/30 text-primary shadow-sm" : "border-border text-muted-foreground hover:bg-secondary"
          }`}
        >
          <Clock className="h-2.5 w-2.5" />
          {disappearTimer ? `${disappearTimer < 60 ? `${disappearTimer}s` : "1m"}` : "Vanish"}
        </button>
        {disappearTimer !== null && DISAPPEAR_OPTIONS.map(opt => (
          <button
            key={opt.seconds}
            onClick={() => setDisappearTimer(opt.seconds)}
            className={`text-[10px] px-2.5 py-1.5 rounded-full border transition-all duration-200 ${
              disappearTimer === opt.seconds ? "bg-primary text-primary-foreground border-primary scale-105" : "border-border text-muted-foreground hover:bg-secondary"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Recording indicator */}
      {recording && (
        <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 rounded-xl px-3 py-2 border border-destructive/20 animate-pulse">
          <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
          Recording... {recordingDuration}s
          <Button size="sm" variant="destructive" className="h-6 text-[10px] ml-auto" onClick={stopRecording}>Stop & Send</Button>
        </div>
      )}

      {/* Input Row */}
      <div className="flex gap-1.5 items-center">
        <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handlePhotoUpload} />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingMedia || recording}
          className="rounded-full p-2 hover:bg-primary/10 hover:text-primary transition-all duration-200 text-muted-foreground disabled:opacity-50"
        >
          <ImageIcon className="h-4 w-4" />
        </button>
        <button
          onClick={recording ? stopRecording : startRecording}
          disabled={uploadingMedia}
          className={`rounded-full p-2 transition-all duration-200 ${
            recording ? "bg-destructive/20 text-destructive scale-110" : "hover:bg-primary/10 hover:text-primary text-muted-foreground"
          } disabled:opacity-50`}
        >
          {recording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>
        <Input
          placeholder="Type a message..."
          value={messageText}
          onChange={e => setMessageText(e.target.value)}
          className="h-9 text-sm flex-1 rounded-xl"
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleTextSend()}
          disabled={recording || uploadingMedia}
        />
        <Button size="sm" className="h-9 px-3 rounded-xl" onClick={handleTextSend} disabled={!messageText.trim() || sendingMsg || recording || uploadingMedia}>
          {sendingMsg || uploadingMedia ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
        </Button>
      </div>
      {uploadingMedia && (
        <div className="flex items-center justify-center gap-2 text-[10px] text-primary">
          <Loader2 className="h-3 w-3 animate-spin" /> Uploading media...
        </div>
      )}
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
  return `${Math.floor(hours / 24)}d ago`;
}

// ─── Family Requests Section ─────────────────────────────────
function FamilyRequestsSection({ requests, members, onAdd, onUpdate, userName, cs, fmt }: {
  requests: FamilyRequest[]; members: FamilyMember[];
  onAdd: (r: Omit<FamilyRequest, "id">) => void;
  onUpdate: (id: string, u: Partial<FamilyRequest>) => void;
  userName: string; cs: string; fmt: (n: number) => string;
}) {
  const [showForm, setShowForm] = useState(false);
  const [desc, setDesc] = useState(""); const [amount, setAmount] = useState("");
  const [type, setType] = useState<FamilyRequestType>("purchase");
  const [toMemberId, setToMemberId] = useState("");
  const pending = requests.filter(r => r.status === "pending");
  const handled = requests.filter(r => r.status !== "pending").slice(-5);

  const handleAdd = () => {
    if (!desc.trim() || !amount) return;
    onAdd({ fromMemberId: "self", toMemberId: toMemberId || undefined, type, description: desc.trim(), amount: parseFloat(amount), status: "pending", date: todayStr() });
    setDesc(""); setAmount(""); setShowForm(false);
  };

  return (
    <Card className="finnyland-card">
      <CardHeader className="pb-2 px-4 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2"><Gift className="h-4 w-4 text-accent" /> Family Requests</CardTitle>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowForm(!showForm)}><Plus className="h-3 w-3 mr-1" /> New</Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {showForm && (
          <div className="flex flex-col gap-2 p-3 rounded-xl bg-accent/5 border border-accent/20 animate-slide-up">
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
                <SelectContent>{members.map(m => <SelectItem key={m.id} value={m.id}>{m.emoji} {m.name}</SelectItem>)}</SelectContent>
              </Select>
            )}
            <Button size="sm" className="h-8 text-xs" onClick={handleAdd} disabled={!desc.trim() || !amount}>Send Request</Button>
          </div>
        )}
        {pending.length === 0 && handled.length === 0 && !showForm && (
          <div className="text-center py-4"><div className="text-3xl mb-2">📭</div><p className="text-xs text-muted-foreground">No requests yet.</p></div>
        )}
        {pending.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Pending</p>
            {pending.map(r => {
              const member = members.find(m => m.id === r.toMemberId);
              return (
                <div key={r.id} className="flex items-center gap-3 rounded-xl bg-warning/5 border border-warning/15 px-3 py-2.5">
                  <div className="text-lg">{r.type === "purchase" ? "🛒" : r.type === "contribution" ? "💰" : r.type === "allowance" ? "🎒" : "📝"}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{r.description}</p>
                    <p className="text-[10px] text-muted-foreground">{fmt(r.amount)} {member ? `→ ${member.emoji} ${member.name}` : ""}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => onUpdate(r.id, { status: "approved" })} className="rounded-full bg-primary/10 hover:bg-primary/20 p-1.5 text-primary transition-colors"><Check className="h-3.5 w-3.5" /></button>
                    <button onClick={() => onUpdate(r.id, { status: "rejected" })} className="rounded-full bg-destructive/10 hover:bg-destructive/20 p-1.5 text-destructive transition-colors"><X className="h-3.5 w-3.5" /></button>
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
                <Badge variant={r.status === "approved" ? "default" : "destructive"} className="text-[10px] h-5">{r.status === "approved" ? "✓" : "✗"} {r.status}</Badge>
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
  piggyBanks: PiggyBankType[]; members: FamilyMember[];
  onAdd: (pb: Omit<PiggyBankType, "id" | "contributions">) => void;
  onContribute: (pbId: string, c: Omit<PiggyBankContribution, "id">) => void;
  onRemove: (id: string) => void; userName: string; cs: string; fmt: (n: number) => string;
}) {
  const [showForm, setShowForm] = useState(false);
  const [childName, setChildName] = useState(""); const [target, setTarget] = useState("");
  const [contribPbId, setContribPbId] = useState<string | null>(null);
  const [contribAmount, setContribAmount] = useState(""); const [contribNote, setContribNote] = useState("");
  const childMembers = members.filter(m => m.relationship === "child");

  const handleAdd = () => {
    if (!childName.trim() || !target) return;
    const childMember = childMembers.find(m => m.name === childName);
    onAdd({ childMemberId: childMember?.id || "", childName: childName.trim(), targetAmount: parseFloat(target), currentAmount: 0, emoji: "🐷" });
    setChildName(""); setTarget(""); setShowForm(false);
  };

  const handleContribute = (pbId: string) => {
    if (!contribAmount) return;
    onContribute(pbId, { amount: parseFloat(contribAmount), date: todayStr(), fromMemberName: userName, note: contribNote || undefined });
    setContribAmount(""); setContribNote(""); setContribPbId(null);
  };

  return (
    <Card className="finnyland-card">
      <CardHeader className="pb-2 px-4 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2"><PiggyBank className="h-4 w-4 text-primary" /> Piggy Banks</CardTitle>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowForm(!showForm)}><Plus className="h-3 w-3 mr-1" /> New</Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {showForm && (
          <div className="flex flex-col gap-2 p-3 rounded-xl bg-primary/5 border border-primary/15 animate-slide-up">
            {childMembers.length > 0 ? (
              <Select value={childName} onValueChange={setChildName}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select child" /></SelectTrigger>
                <SelectContent>{childMembers.map(m => <SelectItem key={m.id} value={m.name}>{m.emoji} {m.name}</SelectItem>)}</SelectContent>
              </Select>
            ) : (
              <Input placeholder="Child's name" value={childName} onChange={e => setChildName(e.target.value)} className="h-9 text-sm" />
            )}
            <Input placeholder="Target amount" type="number" value={target} onChange={e => setTarget(e.target.value)} className="h-9 text-sm" />
            <Button size="sm" className="h-8 text-xs" onClick={handleAdd} disabled={!childName.trim() || !target}>🐷 Create Piggy Bank</Button>
          </div>
        )}
        {piggyBanks.length === 0 && !showForm && (
          <div className="text-center py-4"><div className="text-4xl mb-2">🐷</div><p className="text-xs text-muted-foreground">No piggy banks yet.</p></div>
        )}
        {piggyBanks.map(pb => {
          const pct = pb.targetAmount > 0 ? Math.min((pb.currentAmount / pb.targetAmount) * 100, 100) : 0;
          return (
            <div key={pb.id} className="rounded-xl bg-secondary/40 border border-border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{pb.emoji}</span>
                  <div><p className="text-xs font-bold text-foreground">{pb.childName}'s Piggy Bank</p><p className="text-[10px] text-muted-foreground">{fmt(pb.currentAmount)} of {fmt(pb.targetAmount)}</p></div>
                </div>
                <Badge variant="secondary" className="text-[10px]">{Math.round(pct)}%</Badge>
              </div>
              <Progress value={pct} className="h-2" />
              {contribPbId === pb.id ? (
                <div className="flex gap-2 items-center">
                  <Input placeholder="Amount" type="number" value={contribAmount} onChange={e => setContribAmount(e.target.value)} className="h-8 text-xs flex-1" />
                  <Input placeholder="Note" value={contribNote} onChange={e => setContribNote(e.target.value)} className="h-8 text-xs flex-1" />
                  <Button size="sm" className="h-8 text-xs px-3" onClick={() => handleContribute(pb.id)} disabled={!contribAmount}><Plus className="h-3 w-3" /></Button>
                  <Button size="sm" variant="ghost" className="h-8 text-xs px-2" onClick={() => setContribPbId(null)}><X className="h-3 w-3" /></Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" className="h-7 text-xs w-full" onClick={() => setContribPbId(pb.id)}>🪙 Drop some coins</Button>
              )}
              {pb.contributions.length > 0 && (
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {pb.contributions.slice(-3).map(c => (
                    <div key={c.id} className="flex items-center gap-2 text-[10px] text-muted-foreground"><span>🪙</span><span>{c.fromMemberName} added {fmt(c.amount)}</span>{c.note && <span className="italic">— {c.note}</span>}</div>
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
  goals: SharedGoal[]; members: FamilyMember[];
  onAdd: (g: Omit<SharedGoal, "id" | "contributions">) => void;
  onContribute: (goalId: string, c: Omit<SharedGoalContribution, "id">) => void;
  onRemove: (id: string) => void; userName: string; cs: string; fmt: (n: number) => string;
}) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState(""); const [target, setTarget] = useState("");
  const [emoji, setEmoji] = useState("🎯");
  const [contribGoalId, setContribGoalId] = useState<string | null>(null);
  const [contribAmount, setContribAmount] = useState(""); const [contribMember, setContribMember] = useState("");
  const goalEmojis = ["🎯", "🏖️", "🚗", "🏠", "💻", "🎓", "🎉", "✈️", "📱", "🎸"];

  const handleAdd = () => {
    if (!name.trim() || !target) return;
    onAdd({ name: name.trim(), targetAmount: parseFloat(target), emoji, createdDate: todayStr() });
    setName(""); setTarget(""); setShowForm(false);
  };

  const handleContribute = (goalId: string) => {
    if (!contribAmount) return;
    onContribute(goalId, { memberId: "self", memberName: contribMember || userName, amount: parseFloat(contribAmount), date: todayStr() });
    setContribAmount(""); setContribMember(""); setContribGoalId(null);
  };

  return (
    <Card className="finnyland-card">
      <CardHeader className="pb-2 px-4 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2"><Target className="h-4 w-4 text-accent" /> Shared Goals</CardTitle>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowForm(!showForm)}><Plus className="h-3 w-3 mr-1" /> New</Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {showForm && (
          <div className="flex flex-col gap-2 p-3 rounded-xl bg-accent/5 border border-accent/20 animate-slide-up">
            <Input placeholder="Goal name" value={name} onChange={e => setName(e.target.value)} className="h-9 text-sm" />
            <Input placeholder="Target amount" type="number" value={target} onChange={e => setTarget(e.target.value)} className="h-9 text-sm" />
            <div className="flex gap-1.5 flex-wrap">
              {goalEmojis.map(e => (
                <button key={e} onClick={() => setEmoji(e)} className={`text-lg p-1 rounded-lg transition-all duration-200 ${emoji === e ? "bg-accent/20 ring-2 ring-accent/40 scale-110" : "hover:bg-secondary/50 hover:scale-105"}`}>{e}</button>
              ))}
            </div>
            <Button size="sm" className="h-8 text-xs" onClick={handleAdd} disabled={!name.trim() || !target}>Create Family Goal</Button>
          </div>
        )}
        {goals.length === 0 && !showForm && (
          <div className="text-center py-4"><div className="text-4xl mb-2">🌟</div><p className="text-xs text-muted-foreground">Dream together! Create a shared goal.</p></div>
        )}
        {goals.map(g => {
          const totalContrib = g.contributions.reduce((s, c) => s + c.amount, 0);
          const pct = g.targetAmount > 0 ? Math.min((totalContrib / g.targetAmount) * 100, 100) : 0;
          const byMember = g.contributions.reduce((acc, c) => { acc[c.memberName] = (acc[c.memberName] || 0) + c.amount; return acc; }, {} as Record<string, number>);
          return (
            <div key={g.id} className="rounded-xl bg-secondary/40 border border-border p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{g.emoji}</span>
                  <div><p className="text-xs font-bold text-foreground">{g.name}</p><p className="text-[10px] text-muted-foreground">{fmt(totalContrib)} of {fmt(g.targetAmount)}</p></div>
                </div>
                <Badge variant="secondary" className="text-[10px]">{Math.round(pct)}%</Badge>
              </div>
              <Progress value={pct} className="h-2" />
              {Object.keys(byMember).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(byMember).map(([memberName, amt]) => <span key={memberName} className="text-[10px] bg-primary/10 text-primary rounded-full px-2 py-0.5">{memberName}: {fmt(amt)}</span>)}
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
                        {members.map(m => <SelectItem key={m.id} value={m.name}>{m.emoji} {m.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="h-7 text-xs flex-1" onClick={() => handleContribute(g.id)} disabled={!contribAmount}>Add Contribution</Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setContribGoalId(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <Button variant="outline" size="sm" className="h-7 text-xs w-full" onClick={() => { setContribGoalId(g.id); setContribMember(userName); }}>💪 Contribute</Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default FamilyLandTab;
