import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface IntroFlowProps {
  onComplete: () => void;
}

export function IntroFlow({ onComplete }: IntroFlowProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [transitioning, setTransitioning] = useState(false);

  const handleContinue = () => {
    if (!name.trim()) return;
    setTransitioning(true);
    setTimeout(() => {
      setStep(2);
      setTransitioning(false);
    }, 400);
  };

  const handleEnter = () => {
    localStorage.setItem("finance-buddy-intro-done", "true");
    onComplete();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      {step === 1 && (
        <div
          className={`w-full max-w-sm space-y-8 text-center transition-all duration-400 ${
            transitioning ? "opacity-0 translate-y-4" : "animate-fade-in"
          }`}
        >
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">
              Heyloo buddy, welcome 💛
            </h1>
          </div>

          <div className="space-y-3">
            <p className="text-muted-foreground text-sm">
              What should I call you?
            </p>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="text-center text-lg h-12"
              onKeyDown={(e) => e.key === "Enter" && handleContinue()}
              autoFocus
            />
          </div>

          <Button
            onClick={handleContinue}
            disabled={!name.trim()}
            className="w-full h-12 text-base"
          >
            Continue
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="w-full max-w-sm space-y-6 animate-fade-in">
          <p className="text-muted-foreground text-sm italic text-center">
            Ohhh I was waiting for you.. the poor coder of this application
            asked me to tell you something
          </p>

          <div className="rounded-xl border border-border bg-card p-5 space-y-4 text-sm leading-relaxed text-foreground/90">
            <p>
              Buu why would you expect me not to feel bad ? i remember you
              sending me alot of dishes last time during ramadan and this time
              even though you knew i didnt have money yu didnt even care to ask
              from where i was having ifthaar from and i missed you alot thats
              why i fought for your time and im gonna do it again .. why would i
              not ? you are mine so why cant i pull you to me and why cant i show
              my ugly face when im not able to .. thats all i did .. and i took
              those hardships that day to see you happy and see you smile and how
              could you put a price on it and send me the money ? i felt soo bad
              that time and felt more like a dealer .. if me not having money was
              your concern then you didnt do anything to solve that conern .. i
              literally prayed that yu do send something so that i could believe
              it was out of concern rather than to return money .. Nabi said to
              have a wife who calls yu fajr and i also do wish you to call me
              for Fajr .. i did want all this and you were not even there for me
              to say this .. for what are you fighting with me ? me getting upset
              of not getting your time by missing you ? am i not even allowed to
              do that ? if you dont like me i will go away from you .. i missed
              you and wanted some more time with you so i fought nd what you gave
              me is another 21 days to miss you and put a price on my efforts to
              make you happy .. thank you for everyhting .. check out the UI and
              tell me what you think abt it .. all these were however just things
              to divert my mind to be in some peace..
            </p>
          </div>

          <Button onClick={handleEnter} className="w-full h-12 text-base">
            Enter Application
          </Button>
        </div>
      )}
    </div>
  );
}
