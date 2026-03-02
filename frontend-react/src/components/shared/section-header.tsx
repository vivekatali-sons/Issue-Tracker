import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: string;
  first?: boolean;
}

export function SectionHeader({ title, first }: SectionHeaderProps) {
  return (
    <div className={cn(first ? "mb-6" : "border-t border-border/40 mt-8 pt-6 mb-6")}>
      <h2 className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground/70">
        {title}
      </h2>
    </div>
  );
}
