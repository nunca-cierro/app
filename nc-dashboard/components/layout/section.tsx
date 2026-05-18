import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Container } from "@/components/layout/container";

type SectionProps = {
  id?: string;
  children: ReactNode;
  className?: string;
};

export function Section({ id, children, className }: SectionProps) {
  return (
    <section
      id={id}
      className={cn(
        "py-24 border-b border-border bg-background text-foreground",
        className,
      )}
    >
      <Container>{children}</Container>
    </section>
  );
}
