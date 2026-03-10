import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/constants";
import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";

interface CategorySelectProps {
  value: string;
  onChange: (val: string) => void;
  type: "income" | "expense";
  className?: string;
  customCategories?: string[];
}

export function CategorySelect({ value, onChange, type, className, customCategories = [] }: CategorySelectProps) {
  const [customMode, setCustomMode] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const defaults = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  
  // Merge default + custom, deduplicate, ensure "Other" is last before "+ Custom"
  const allCategories = [
    ...defaults.filter(c => c !== "Other"),
    ...customCategories.filter(c => !defaults.includes(c as any) && c !== "Other"),
    "Other",
  ];

  useEffect(() => {
    if (customMode && inputRef.current) {
      // Ensure keyboard pops up on mobile
      inputRef.current.focus();
      inputRef.current.click();
    }
  }, [customMode]);

  if (customMode) {
    return (
      <div className="flex gap-1">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type custom category"
          className={className || "h-9"}
          autoFocus
          inputMode="text"
          enterKeyHint="done"
        />
        <button
          type="button"
          onClick={() => { setCustomMode(false); onChange("Other"); }}
          className="text-xs text-muted-foreground hover:text-foreground px-1"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <Select
      value={allCategories.includes(value) ? value : "__custom"}
      onValueChange={(v) => {
        if (v === "__custom") {
          setCustomMode(true);
          onChange("");
        } else {
          onChange(v);
        }
      }}
    >
      <SelectTrigger className={className || "h-9"}>
        <SelectValue placeholder="Select category" />
      </SelectTrigger>
      <SelectContent>
        {allCategories.map((cat) => (
          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
        ))}
        <SelectItem value="__custom">+ Custom</SelectItem>
      </SelectContent>
    </Select>
  );
}
