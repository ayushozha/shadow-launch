"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[shadow-launch] global error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          background: "#ece4d2",
          color: "#0c0c0a",
          fontFamily: "Georgia, 'Times New Roman', serif",
          padding: "64px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ maxWidth: 720, width: "100%" }}>
          <div
            style={{
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: 11,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#6a6454",
              borderBottom: "1px solid rgba(12,12,10,0.1)",
              paddingBottom: 14,
              marginBottom: 32,
            }}
          >
            Root failure / Layout did not boot
          </div>
          <h1
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: "clamp(40px, 7vw, 88px)",
              lineHeight: 0.95,
              letterSpacing: "-0.03em",
              margin: "0 0 24px 0",
            }}
          >
            Something went{" "}
            <span style={{ fontStyle: "italic", color: "#1a1a16" }}>
              sideways.
            </span>
          </h1>
          <p
            style={{
              fontSize: 18,
              lineHeight: 1.5,
              color: "#1a1a16",
              maxWidth: 560,
              margin: "0 0 24px 0",
            }}
          >
            The root layout failed to render. This is rare. Try reloading. If it
            persists, the backend or build is in a bad state.
          </p>
          <div
            style={{
              border: "1px solid rgba(12,12,10,0.22)",
              background: "rgba(255,252,244,0.5)",
              padding: 20,
              marginBottom: 28,
            }}
          >
            <div
              style={{
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: 10,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "#6a6454",
                marginBottom: 10,
              }}
            >
              Error message
            </div>
            <pre
              style={{
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: 12,
                lineHeight: 1.55,
                color: "#1a1a16",
                margin: 0,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {error.message || "Unknown error"}
              {error.digest ? `\n\ndigest: ${error.digest}` : ""}
            </pre>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: 11,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                padding: "12px 20px",
                border: "1px solid #0c0c0a",
                background: "#0c0c0a",
                color: "#ece4d2",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: 11,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                padding: "12px 8px",
                color: "#1a1a16",
                textDecoration: "none",
                borderBottom: "1px solid #0c0c0a",
              }}
            >
              Go home →
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
