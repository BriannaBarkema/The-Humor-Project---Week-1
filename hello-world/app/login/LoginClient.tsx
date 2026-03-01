"use client";

import { useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

function safeNext(raw: string | null) {
    if (!raw) return "/dorms";
    if (!raw.startsWith("/")) return "/dorms";
    if (raw.startsWith("/auth")) return "/dorms";
    return raw;
}

function setPostLoginCookie(nextPath: string) {
    const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
    const secure = isHttps ? "; Secure" : "";
    document.cookie = `post_login_redirect=${encodeURIComponent(
        nextPath
    )}; Path=/; SameSite=Lax${secure}`;
}

export default function LoginClient() {
    const supabase = createClient();
    const sp = useSearchParams();
    const next = safeNext(sp.get("next"));

    const signInWithGoogle = async () => {
        setPostLoginCookie(next);

        const origin = window.location.origin;
        const redirectTo = `${origin}/auth/callback`; // IMPORTANT: no query params

        await supabase.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo },
        });
    };

    const label =
        next === "/captions"
            ? "captions"
            : next === "/caption_generate"
                ? "caption generator"
                : "dorms";

    return (
        <main style={styles.page}>
            <div style={styles.shell}>
                <div style={styles.card}>
                    <div style={styles.header}>
                        <h1 style={styles.h1}>Sign in</h1>
                        <p style={styles.subtle}>Continue with Google to access {label}.</p>
                    </div>

                    <button type="button" onClick={signInWithGoogle} style={styles.primaryBtn}>
            <span style={styles.iconWrap} aria-hidden>
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.06 1.53 7.45 2.81l5.43-5.43C33.58 3.86 29.25 1.5 24 1.5 14.96 1.5 7.2 6.68 3.49 14.23l6.6 5.12C11.78 13.26 17.39 9.5 24 9.5z"
                />
                <path
                    fill="#4285F4"
                    d="M46.5 24.5c0-1.57-.14-3.08-.4-4.55H24v8.62h12.7c-.55 2.94-2.22 5.44-4.74 7.12l7.27 5.64C43.56 37.12 46.5 31.3 46.5 24.5z"
                />
                <path
                    fill="#FBBC05"
                    d="M10.09 28.65c-.5-1.5-.79-3.1-.79-4.65s.29-3.15.79-4.65l-6.6-5.12C1.86 17.27 1.5 20.58 1.5 24s.36 6.73 1.99 9.77l6.6-5.12z"
                />
                <path
                    fill="#34A853"
                    d="M24 46.5c6.48 0 11.92-2.14 15.9-5.82l-7.27-5.64c-2.02 1.36-4.6 2.16-8.63 2.16-6.61 0-12.22-3.76-14.22-8.85l-6.6 5.12C7.2 41.32 14.96 46.5 24 46.5z"
                />
                <path fill="none" d="M1.5 1.5h45v45h-45z" />
              </svg>
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
        boxShadow: "0 8px 22px rgba(0,0,0,0.2)",
    },
    iconWrap: {
        width: 26,
        height: 26,
        borderRadius: 999,
        display: "grid",
        placeItems: "center",
        border: "1px solid rgba(255,255,255,0.18)",
        background: "rgba(255,255,255,0.06)",
    },
};