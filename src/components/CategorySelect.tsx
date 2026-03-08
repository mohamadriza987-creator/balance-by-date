import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/constants";
import { useState } from "react";
import { Input } from "@/components/ui/input";

interface CategorySelectProps {
  value: string;
  onChange: (val: string) => void;
  type: "income" | "expense";
  className?: string;
}

export function CategorySelect({ value, onChange, type, className }: CategorySelectProps) {
  const [customMode, setCustomMode] = useState(false);
  const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  if (customMode) {
    return (
      <div className="flex gap-1">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Custom category"
          className={className || "h-9"}
          autoFocus
        />
        <button
          type="button"
          onClick={() => setCustomMode(false)}
          className="text-xs text-muted-foreground hover:text-foreground px-1"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <Select
      value={categories.includes(value as any) ? value : "__custom"}
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
        {categories.map((cat) => (
          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
        ))}
        <SelectItem value="__custom">+ Custom</SelectItem>
      </SelectContent>
    </Select>
  );
}
