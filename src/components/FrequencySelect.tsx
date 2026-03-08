import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FREQUENCY_OPTIONS } from "@/lib/constants";
import type { Frequency } from "@/lib/finance-types";

interface FrequencySelectProps {
  value: Frequency;
  onChange: (v: Frequency) => void;
  className?: string;
}

export function FrequencySelect({ value, onChange, className }: FrequencySelectProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Frequency)}>
      <SelectTrigger className={className || "h-9"}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {FREQUENCY_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
