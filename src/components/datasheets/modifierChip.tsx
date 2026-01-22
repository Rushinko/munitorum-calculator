import { camelCaseToString } from "@/lib/utils";
import { Badge } from "../ui/badge";

type ModifierChipProps = {
  modifier: string;
  value: boolean | number | string;
  variant?: "default" | "secondary" | "destructive" | "outline";
}

export default function ModifierChip({ modifier, value, variant = "default" }: ModifierChipProps) {
  return (
    <Badge variant={variant} className="font-normal">
      {
        typeof value === 'boolean' ? camelCaseToString(modifier) : `${camelCaseToString(modifier)}: ${value}`
      }
    </Badge>
  );
}