import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { SunLogo } from "@/components/eco/logo";
import type { NextStep } from "@/lib/flow";

export function EmptyStep({ title, text, step, children }: { title: string; text: string; step: NonNullable<NextStep>; children?: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 py-12 text-center animate-rise">
      <SunLogo className="h-20 w-20" />
      <h2 className="mt-5 text-xl font-extrabold">{title}</h2>
      <p className="mt-2 text-sm leading-7 text-muted-foreground">{text}</p>
      <Button asChild variant="ink" size="xl" className="mt-6 w-full">
        <Link to={step.to}>{step.label}</Link>
      </Button>
      {children}
    </div>
  );
}
