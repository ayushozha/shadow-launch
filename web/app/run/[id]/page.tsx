import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * `/run/[id]` is the wizard entrypoint. We immediately forward to Stage 1 ·
 * Brand Read. Users coming back to a run mid-flight can deep-link into a
 * later stage slug (e.g. `/run/xyz/4-social`) — those routes exist under
 * `/run/[id]/[stage]/page.tsx` and bypass this redirect.
 */
export default async function RunEntry({ params }: PageProps) {
  const { id } = await params;
  redirect(`/run/${encodeURIComponent(id)}/1-brand`);
}
