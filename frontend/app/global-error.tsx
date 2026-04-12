"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html>
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "40px", background: "#f9fafb" }}>
        <div style={{ maxWidth: 600, margin: "0 auto", background: "white", borderRadius: 16, padding: 32, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
          <h2 style={{ color: "#111827", marginBottom: 8 }}>Something went wrong</h2>
          <p style={{ color: "#EF4444", fontWeight: 600, marginBottom: 4 }}>{error?.name}: {error?.message}</p>
          {error?.digest && <p style={{ color: "#6B7280", fontSize: 12, marginBottom: 16 }}>Digest: {error.digest}</p>}
          <pre style={{ background: "#f3f4f6", padding: 16, borderRadius: 8, fontSize: 11, overflow: "auto", marginBottom: 24, whiteSpace: "pre-wrap" }}>
            {error?.stack}
          </pre>
          <button onClick={reset} style={{ background: "#6366F1", color: "white", border: "none", padding: "10px 24px", borderRadius: 10, cursor: "pointer" }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
