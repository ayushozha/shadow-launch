"use client";

// Shared hook for every wizard page. Subscribes to the live SSE stream AND
// polls /api/runs/{id} for the materialized Run snapshot. Returns both the
// latest trace events and the current Run object. Each wizard page uses
// `run` for rendering its stage-specific data, and `trace` + `connection`
// for the StageReadout component.

import { useEffect, useRef, useState } from "react";

import { getRun, subscribeToRunEvents } from "./api";
import type { Run, RunStatus, TraceEvent } from "./types";

export interface UseRunDataResult {
  run: Run | null;
  trace: TraceEvent[];
  status: RunStatus | "unknown";
  error: string | null;
  connection: "connecting" | "open" | "retrying" | "closed";
}

const POLL_MS = 4000;

export function useRunData(runId: string): UseRunDataResult {
  const [run, setRun] = useState<Run | null>(null);
  const [trace, setTrace] = useState<TraceEvent[]>([]);
  const [status, setStatus] = useState<RunStatus | "unknown">("unknown");
  const [error, setError] = useState<string | null>(null);
  const [connection, setConnection] = useState<UseRunDataResult["connection"]>(
    "connecting",
  );

  const closedByUsRef = useRef(false);

  useEffect(() => {
    closedByUsRef.current = false;
    let disposed = false;
    let retryDelay = 1000;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    let currentHandle: { close: () => void } | null = null;

    async function refetch() {
      try {
        const r = await getRun(runId);
        if (disposed) return;
        setRun(r);
        setStatus(r.status);
        setError(null);
        if (r.status === "completed" || r.status === "failed") {
          // terminal; no more polling
          if (pollTimer) clearTimeout(pollTimer);
          closedByUsRef.current = true;
          currentHandle?.close();
          setConnection("closed");
          return;
        }
      } catch (e) {
        if (disposed) return;
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
      }
      pollTimer = setTimeout(refetch, POLL_MS);
    }

    function openStream() {
      setConnection("connecting");
      currentHandle = subscribeToRunEvents(
        runId,
        (evt) => {
          if (disposed) return;
          setTrace((prev) => [...prev, evt]);
          setConnection("open");
          retryDelay = 1000;
        },
        () => {
          if (disposed || closedByUsRef.current) return;
          setConnection("retrying");
          setTimeout(() => {
            if (disposed || closedByUsRef.current) return;
            openStream();
          }, Math.min(retryDelay, 30_000));
          retryDelay = Math.min(retryDelay * 2, 30_000);
        },
      );
    }

    openStream();
    refetch();

    return () => {
      disposed = true;
      closedByUsRef.current = true;
      if (pollTimer) clearTimeout(pollTimer);
      currentHandle?.close();
    };
  }, [runId]);

  return { run, trace, status, error, connection };
}
