import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Container } from "@/components/layout/container";

type SectionProps = {
  id?: string;
  children: ReactNode;
  className?: string;
  containerClassName?: string;
};

export function Section({
  id,
  children,
  className,
  containerClassName,
}: SectionProps) {
  return (
    <section
      id={id}
      className={cn(
        "py-24 border-b border-border bg-background text-foreground",
        className,
      )}
    >
      <Container className={containerClassName}>{children}</Container>
    </section>
  );
}
