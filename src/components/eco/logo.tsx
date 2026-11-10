import { Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export function SunLogo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center rounded-full bg-primary", className)}>
      <Sun className="h-1/2 w-1/2 animate-sun text-primary-foreground" strokeWidth={2.2} />
    </div>
  );
}
