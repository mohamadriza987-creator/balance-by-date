import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Heart, Users, PiggyBank, Target, Plus, Check, X,
  Baby, UserPlus, Gift, ArrowRight, Sparkles, TreePine
} from "lucide-react";
import type {
  AppData, FamilyMember, FamilyRequest, PiggyBank as PiggyBankType,
  SharedGoal, FamilyRelationship, FamilyRequestType, FamilyRequestStatus,
  PiggyBankContribution, SharedGoalContribution
} from "@/lib/finance-types";
import { formatMoney } from "@/lib/finance-utils";

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
}: FamilyLandTabProps) {
  const family = data.familyData || { members: [], requests: [], piggyBanks: [], sharedGoals: [] };
  const cs = data.userProfile?.currencySymbol || "$";
  const fmt = (n: number) => formatMoney(n, cs);

  const pendingRequests = family.requests.filter(r => r.status === "pending");

  // Family insights
  const insights = useMemo(() => {
    const msgs: { text: string; emoji: string }[] = [];
    if (pendingRequests.length > 0) {
      msgs.push({ text: `You have ${pendingRequests.length} family request${pendingRequests.length > 1 ? "s" : ""} waiting for your attention.`, emoji: "📬" });
    }
    family.piggyBanks.forEach(pb => {
      const pct = pb.targetAmount > 0 ? (pb.currentAmount / pb.targetAmount) * 100 : 0;
      if (pct >= 100) {
        msgs.push({ text: `${pb.childName}'s piggy bank is full! 🎉 Time to celebrate!`, emoji: "🐷" });
      } else if (pb.contributions.length === 0) {
        msgs.push({ text: `${pb.childName}'s piggy bank could use its first top-up.`, emoji: "🪙" });
      }
    });
    family.sharedGoals.forEach(g => {
      const total = g.contributions.reduce((s, c) => s + c.amount, 0);
      const pct = g.targetAmount > 0 ? (total / g.targetAmount) * 100 : 0;
      if (pct >= 75 && pct < 100) {
        msgs.push({ text: `"${g.name}" is almost there — ${Math.round(pct)}% done!`, emoji: "🌟" });
      } else if (pct >= 100) {
        msgs.push({ text: `"${g.name}" reached its target! Time to make it happen. ✨`, emoji: "🎯" });
      }
    });
    if (family.members.length === 0) {
      msgs.push({ text: "Add your first family member to start your Family Land! 🌱", emoji: "👋" });
    }
    return msgs.slice(0, 3);
  }, [family, pendingRequests]);

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

// ─── Family Members Section ──────────────────────────────────
function FamilyMembersSection({ members, onAdd, onRemove }: {
  members: FamilyMember[];
  onAdd: (m: Omit<FamilyMember, "id">) => void;
  onRemove: (id: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState<FamilyRelationship>("spouse");

  const handleAdd = () => {
    if (!name.trim()) return;
    const emojis = RELATIONSHIP_EMOJIS[relationship];
    onAdd({
      name: name.trim(),
      relationship,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      addedDate: todayStr(),
    });
    setName("");
    setShowForm(false);
  };

  return (
    <Card className="finnyland-card">
      <CardHeader className="pb-2 px-4 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> Family Circle
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-3 w-3 mr-1" /> Add
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {showForm && (
          <div className="flex flex-col gap-2 mb-3 p-3 rounded-xl bg-secondary/50 border border-border">
            <Input placeholder="Name" value={name} onChange={e => setName(e.target.value)} className="h-9 text-sm" />
            <Select value={relationship} onValueChange={(v) => setRelationship(v as FamilyRelationship)}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="spouse">💍 Spouse / Partner</SelectItem>
                <SelectItem value="child">🧒 Child</SelectItem>
                <SelectItem value="parent">🧓 Parent</SelectItem>
                <SelectItem value="sibling">🤝 Sibling</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" className="h-8 text-xs" onClick={handleAdd} disabled={!name.trim()}>
              Add to Family
            </Button>
          </div>
        )}

        {members.length === 0 ? (
          <div className="text-center py-6">
            <div className="text-4xl mb-2">🌱</div>
            <p className="text-xs text-muted-foreground">Your family circle is empty. Add someone to get started!</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {members.map(m => (
              <div key={m.id} className="flex items-center gap-2 rounded-full bg-secondary/60 border border-border px-3 py-1.5 group">
                <span className="text-lg">{m.emoji}</span>
                <div>
                  <span className="text-xs font-semibold text-foreground">{m.name}</span>
                  <span className="text-[10px] text-muted-foreground ml-1 capitalize">({m.relationship})</span>
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
          // Group contributions by member
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

              {/* Contribution breakdown by member */}
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
