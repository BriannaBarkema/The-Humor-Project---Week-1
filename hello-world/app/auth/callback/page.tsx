"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function Page() {
    const router = useRouter();

    useEffect(() => {
        const run = async () => {
            const supabase = createClient();

            const url = new URL(window.location.href);
            const code = url.searchParams.get("code");

            const hash = window.location.hash || "";
            const hasOAuthError = hash.includes("error=");

            // Cancel / provider error case
            if (hasOAuthError) {
                router.replace("/login");
                return;
            }

            // If we have a code, exchange it for a session
            if (code) {
                try {
                    await supabase.auth.exchangeCodeForSession(code);

                    // Confirm the session is actually present client-side
                    const { data, error } = await supabase.auth.getUser();
                    if (error || !data.user) {
                        router.replace("/login");
                        return;
                    }

                    router.replace("/dorms");
                    return;
                } catch {
                    router.replace("/login");
                    return;
                }
            }

            // No code and no error — go to login
            router.replace("/login");
        };

        void run();
    }, [router]);

    return (
        <main style={styles.page}>
            <div style={styles.card}>
                <div style={styles.title}>Signing you in…</div>
                <div style={styles.subtle}>You’ll be redirected automatically.</div>
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
    card: {
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(255,255,255,0.04)",
        borderRadius: 16,
        padding: 18,
        boxShadow: "0 8px 22px rgba(0,0,0,0.25)",
        maxWidth: 520,
    },
    title: {
        fontSize: 18,
        fontWeight: 800,
        letterSpacing: -0.2,
    },
    subtle: {
        marginTop: 8,
        opacity: 0.75,
        fontSize: 14,
    },
};
