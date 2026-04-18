import Spinner from "@/components/common/Spinner";

export default function Loading() {
  return (
    <div className="flex min-h-[40vh] w-full items-center justify-center px-10 py-24">
      <div className="flex items-center gap-3 text-[var(--ink-soft)]">
        <Spinner size={16} className="text-[var(--accent)]" />
        <span className="mono text-[var(--muted)]">Gathering signals...</span>
      </div>
    </div>
  );
}
