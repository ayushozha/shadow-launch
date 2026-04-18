import type { ReactNode } from "react";

type PaperCardProps = {
  children: ReactNode;
  className?: string;
};

export default function PaperCard({ children, className }: PaperCardProps) {
  return (
    <div
      className={`border border-[var(--rule)] bg-[rgba(255,252,244,0.5)] p-6${
        className ? ` ${className}` : ""
      }`}
    >
      {children}
    </div>
  );
}
