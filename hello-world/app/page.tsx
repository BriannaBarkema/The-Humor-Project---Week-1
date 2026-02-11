"use client";

import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
  const supabase = createClient();

  const signInWithGoogle = async () => {
    const origin = window.location.origin;
    const redirectTo = `${origin}/auth/callback`;

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
  };

  return (
      <main style={styles.page}>
        <div style={styles.shell}>
          <div style={styles.card}>
            <div style={styles.header}>
              <h1 style={styles.h1}>Sign in</h1>
              <p style={styles.subtle}>Continue with Google to access dorms.</p>
            </div>

            <button type="button" onClick={signInWithGoogle} style={styles.primaryBtn}>
            <span style={styles.gBadge} aria-hidden>
              G
            </span>
              Continue with Google
            </button>
          </div>
        </div>
      </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: 28,
    maxWidth: 1100,
    margin: "0 auto",
  },
  shell: {
    minHeight: "calc(100vh - 56px)",
    display: "grid",
    placeItems: "center",
  },
  card: {
    width: "100%",
    maxWidth: 520,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.04)",
    borderRadius: 18,
    padding: 18,
    boxShadow: "0 10px 26px rgba(0,0,0,0.28)",
  },
  header: {
    marginBottom: 14,
  },
  h1: {
    fontSize: 30,
    fontWeight: 800,
    letterSpacing: -0.3,
    margin: 0,
    lineHeight: 1.1,
  },
  subtle: {
    margin: "8px 0 0 0",
    opacity: 0.75,
    fontSize: 14,
  },
  primaryBtn: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.08)",
    color: "inherit",
    fontSize: 14.5,
    fontWeight: 750,
    cursor: "pointer",
    boxShadow: "0 8px 22px rgba(0,0,0,0.20)",
  },
  gBadge: {
    width: 22,
    height: 22,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.06)",
    fontWeight: 900,
    fontSize: 13,
    lineHeight: 1,
  },
};
