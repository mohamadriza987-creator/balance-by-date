import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Check for recovery token in URL hash
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setReady(true);
    }
  }, []);

  const handleReset = async () => {
    if (!password || password.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password updated", description: "You can now use your new password." });
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-6 text-center animate-fade-in">
        <h2 className="text-xl font-bold text-foreground">Set New Password</h2>
        {ready ? (
          <div className="space-y-4">
            <div className="text-left">
              <Label className="text-xs">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={password} onChange={e => setPassword(e.target.value)} placeholder="New password" type="password" className="pl-10 h-11"
                  onKeyDown={e => e.key === "Enter" && handleReset()} />
              </div>
            </div>
            <Button onClick={handleReset} disabled={loading || !password} className="w-full h-12 text-base">
              {loading ? "Updating..." : "Update Password"}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Invalid or expired reset link. Please request a new one.</p>
        )}
      </div>
    </div>
  );
}
