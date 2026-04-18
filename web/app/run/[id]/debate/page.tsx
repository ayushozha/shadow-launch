import Link from "next/link";
import { getDebate, getRun } from "@/lib/api";
import type {
  PersonaReaction,
  Run,
  TargetType,
  Verdict,
} from "@/lib/types";
import { PERSONA_LABELS } from "@/lib/types";
import DebateTargetRow from "@/components/debate/DebateTargetRow";

// Full persona debate panel. 6 personas as columns per target (angle/post/
// asset/slot). Round-2 rebuttals render as threaded replies under round 1.
// Server component. Prefers /debate endpoint; falls back to full Run.

type PageParams = Promise<{ id: string }>;

export const dynamic = "force-dynamic";

export default async function DebatePage({ params }: { params: PageParams }) {
  const { id: runId } = await params;

  let reactions: PersonaReaction[] = [];
  let verdicts: Verdict[] = [];
  let run: Run | null = null;
  let loadError: string | null = null;

  try {
    const payload = await getDebate(runId);
    reactions = payload.reactions;
    verdicts = payload.verdicts;
    // Still fetch the Run so we can show labels (hook for an angle, copy for
    // a slot, etc). If this fails, we just render ids.
    try {
      run = await getRun(runId);
    } catch {
      /* ignore — labels will fall back to ids */
    }
  } catch {
    // Dedicated endpoint unavailable — fall back to full Run.
    try {
      run = await getRun(runId);
      reactions = run.reactions;
      verdicts = run.verdicts;
    } catch (err) {
      loadError = err instanceof Error ? err.message : String(err);
    }
  }

  if (loadError || reactions.length === 0) {
    return (
      <main className="relative z-[1]">
        <TopBar runId={runId} />
        <section className="mx-auto max-w-3xl px-6 py-24 font-serif">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--accent)]">
            Debate unavailable
          </p>
          <h1 className="mt-3 font-serif text-[40px] leading-[1.05] tracking-[-0.02em] text-[var(--ink)]">
            {loadError
              ? "Run not found or still in progress."
              : "No persona reactions yet."}
          </h1>
          {loadError && (
            <pre className="mt-6 max-w-full overflow-x-auto border border-[var(--rule)] bg-[rgba(255,252,244,0.4)] p-4 font-mono text-[11px] text-[var(--ink-soft)]">
              {loadError}
            </pre>
          )}
          <Link
            href={`/results/${runId}`}
            className="mt-8 inline-block border border-[var(--ink)] bg-[var(--ink)] px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--paper)] transition-colors hover:bg-[var(--accent)] hover:border-[var(--accent)]"
          >
            back to results
          </Link>
        </section>
      </main>
    );
  }

  // Group reactions by (target_type, target_id).
  type Key = string;
  const grouped = new Map<
    Key,
    { targetType: TargetType; targetId: string; list: PersonaReaction[] }
  >();
  for (const r of reactions) {
    const key = `${r.target_type}::${r.target_id}`;
    const entry = grouped.get(key);
    if (entry) entry.list.push(r);
    else
      grouped.set(key, {
        targetType: r.target_type,
        targetId: r.target_id,
        list: [r],
      });
  }

  const verdictByKey = new Map(
    verdicts.map((v) => [`${v.target_type}::${v.target_id}`, v]),
  );

  // Label lookup via the Run.
  const labelFor = (t: TargetType, id: string): string | undefined => {
    if (!run) return undefined;
    if (t === "angle") {
      return run.campaign?.angles.find((a) => a.angle_id === id)?.hook;
    }
    if (t === "slot") {
      return run.calendar?.slots.find((s) => s.slot_id === id)?.copy;
    }
    if (t === "asset") {
      // no label; return undefined
      return undefined;
    }
    return undefined;
  };

  // Ordered keys: angle → asset → post → slot, with action-required first within each.
  const order: Record<TargetType, number> = {
    angle: 0,
    asset: 1,
    post: 2,
    slot: 3,
  };
  const rows = Array.from(grouped.values()).sort((a, b) => {
    const oa = order[a.targetType];
    const ob = order[b.targetType];
    if (oa !== ob) return oa - ob;
    const va = verdictByKey.get(`${a.targetType}::${a.targetId}`);
    const vb = verdictByKey.get(`${b.targetType}::${b.targetId}`);
    const aa = va?.action_required ? 0 : 1;
    const bb = vb?.action_required ? 0 : 1;
    return aa - bb;
  });

  return (
    <main className="relative z-[1]">
      <TopBar runId={runId} />

      <section className="border-b border-[var(--rule)] px-5 py-10 md:px-10 md:py-14">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-6">
          <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-[var(--rule-soft)] pb-5">
            <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">
              Persona debate · {rows.length} targets · {reactions.length}{" "}
              reactions
            </span>
            <span className="font-serif text-[13px] italic text-[var(--muted)]">
              6 synthetic buyers · via Minds AI
            </span>
          </div>

          <h1
            className="font-serif text-[clamp(40px,6vw,80px)] leading-[0.96] tracking-[-0.02em] text-[var(--ink)]"
            style={{ fontVariationSettings: '"opsz" 144, "wght" 420' }}
          >
            Pressure-tested, position by position.
          </h1>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4">
            {(
              [
                "marketing_vp",
                "cfo_skeptic",
                "engineering_lead",
                "target_end_user",
                "social_media_manager",
                "pr_brand_authority",
              ] as const
            ).map((pid) => (
              <span
                key={pid}
                className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]"
              >
                {PERSONA_LABELS[pid]}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-6 md:px-10 md:py-10">
        <div className="mx-auto max-w-[1440px]">
          {rows.map(({ targetType, targetId, list }) => (
            <DebateTargetRow
              key={`${targetType}::${targetId}`}
              targetType={targetType}
              targetId={targetId}
              label={labelFor(targetType, targetId)}
              reactions={list}
              verdict={verdictByKey.get(`${targetType}::${targetId}`)}
            />
          ))}
        </div>
      </section>
    </main>
  );
}

function TopBar({ runId }: { runId: string }) {
  return (
    <div className="border-b border-[var(--rule)] bg-[rgba(236,228,210,0.92)] px-5 py-4 backdrop-blur md:px-10">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-3">
        <Link
          href="/"
          className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted)] hover:text-[var(--ink)]"
        >
          ← shadow launch
        </Link>
        <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">
          /
        </span>
        <Link
          href={`/results/${runId}`}
          className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted)] hover:text-[var(--ink)]"
        >
          results · {runId}
        </Link>
        <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">
          /
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--ink)]">
          debate
        </span>
      </div>
    </div>
  );
}
