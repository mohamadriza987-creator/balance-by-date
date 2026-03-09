import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ACCOUNT_OPTIONS } from "@/lib/constants";
import type { AccountType } from "@/lib/finance-types";

interface AccountSelectProps {
  value: AccountType;
  onChange: (v: AccountType) => void;
  className?: string;
  enabledAccounts?: AccountType[];
}

export function AccountSelect({ value, onChange, className, enabledAccounts }: AccountSelectProps) {
  const options = enabledAccounts
    ? ACCOUNT_OPTIONS.filter((opt) => enabledAccounts.includes(opt.value))
    : ACCOUNT_OPTIONS;

  return (
    <Select value={value} onValueChange={(v) => onChange(v as AccountType)}>
      <SelectTrigger className={className || "h-9"}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
