import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, ArrowLeft } from "lucide-react";

type AuthMode = "choose" | "login" | "signup" | "forgot";

interface AuthPageProps {
  userName: string;
  onBack?: () => void;
}

export function AuthPage({ userName, onBack }: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>("choose");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
        extraParams: {
          prompt: "select_account",
        },
      });
      if (result.error) {
        toast({ title: "Error", description: String(result.error), variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Google sign-in failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignUp = async () => {
    if (!email || !password) return;
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) {
      toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Check your email", description: "We sent you a confirmation link." });
    }
  };

  const handleEmailLogin = async () => {
    if (!email || !password) return;
    setLoading(true);
    const { data: loginData, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } else if (loginData?.user && email.toLowerCase() === "test@gmail.com") {
      // Test account: reset profile and finance data for fresh onboarding
      await supabase
        .from("profiles")
        .update({
          onboarding_complete: false,
          name: null,
          first_name: null,
          last_name: null,
          finny_user_id: null,
          birthday: null,
          gender: null,
          marital_status: null,
          phone_code: null,
          phone_number: null,
          country: null,
          currency: null,
          currency_symbol: "$",
          enabled_accounts: [],
        })
        .eq("user_id", loginData.user.id);
      await supabase
        .from("user_finance_data")
        .update({ finance_data: {} })
        .eq("user_id", loginData.user.id);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) return;
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Email sent", description: "Check your inbox for the reset link." });
    }
  };

  if (mode === "choose") {
    return (
      <div className="w-full max-w-sm space-y-6 text-center animate-fade-in">
        {onBack && (
          <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        )}

        <div className="space-y-2">
          <p className="text-lg text-foreground font-medium">
            Let's get you set up, <span className="text-primary italic">{userName}</span>
          </p>
          <p className="text-sm text-muted-foreground">Sign in to save your data securely</p>
        </div>

        <div className="space-y-3">
          <Button onClick={handleGoogle} disabled={loading} variant="outline" className="w-full h-12 text-base gap-2">
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </Button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <Button onClick={() => setMode("signup")} className="w-full h-12 text-base">
            Sign up with Email
          </Button>

          <Button onClick={() => setMode("login")} variant="ghost" className="w-full h-10 text-sm text-muted-foreground">
            Already have an account? Log in
          </Button>
        </div>
      </div>
    );
  }

  if (mode === "forgot") {
    return (
      <div className="w-full max-w-sm space-y-6 animate-fade-in">
        <button onClick={() => setMode("login")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to login
        </button>
        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold text-foreground">Reset Password</h2>
          <p className="text-sm text-muted-foreground">We'll send you a reset link</p>
        </div>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="pl-10 h-11" />
            </div>
          </div>
          <Button onClick={handleForgotPassword} disabled={loading || !email} className="w-full h-12 text-base">
            {loading ? "Sending..." : "Send Reset Link"}
          </Button>
        </div>
      </div>
    );
  }

  const isLogin = mode === "login";
  return (
    <div className="w-full max-w-sm space-y-6 animate-fade-in">
      <button onClick={() => setMode("choose")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold text-foreground">{isLogin ? "Welcome back" : "Create account"}</h2>
        <p className="text-sm text-muted-foreground">{isLogin ? "Log in to your account" : "Sign up with your email"}</p>
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-xs">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="pl-10 h-11" type="email" />
          </div>
        </div>
        <div>
          <Label className="text-xs">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="pl-10 h-11" type="password"
              onKeyDown={e => e.key === "Enter" && (isLogin ? handleEmailLogin() : handleEmailSignUp())} />
          </div>
        </div>

        <Button onClick={isLogin ? handleEmailLogin : handleEmailSignUp} disabled={loading || !email || !password} className="w-full h-12 text-base">
          {loading ? "Please wait..." : isLogin ? "Log In" : "Sign Up"}
        </Button>

        {isLogin && (
          <Button variant="ghost" className="w-full text-xs text-muted-foreground" onClick={() => setMode("forgot")}>
            Forgot password?
          </Button>
        )}

        <Button variant="ghost" className="w-full text-sm text-muted-foreground" onClick={() => setMode(isLogin ? "signup" : "login")}>
          {isLogin ? "Don't have an account? Sign up" : "Already have an account? Log in"}
        </Button>
      </div>
    </div>
  );
}
