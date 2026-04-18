"use client";

interface Props {
  items: string[];
  /** Fallback copy when the list is empty — keeps the section honest. */
  emptyLabel?: string;
}

/**
 * Bullet list for messaging gaps / differentiators. Thin accent dot,
 * serif body, generous leading. Editing is deferred to a later pass.
 */
export function DifferentiatorList({
  items,
  emptyLabel = "Nothing surfaced.",
}: Props) {
  if (!items || items.length === 0) {
    return (
      <p className="font-serif italic text-[var(--muted)]">{emptyLabel}</p>
    );
  }
  return (
    <ul className="flex flex-col gap-3">
      {items.map((item, i) => (
        <li
          key={`${i}-${item.slice(0, 20)}`}
          className="flex items-baseline gap-3 font-serif text-[17px] leading-[1.55]"
        >
          <span
            aria-hidden="true"
            className="mt-[9px] inline-block h-[5px] w-[5px] flex-shrink-0 rounded-full bg-[var(--accent)]"
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
