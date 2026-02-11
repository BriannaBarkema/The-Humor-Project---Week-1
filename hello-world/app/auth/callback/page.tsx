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
            if (hash.includes("error=")) {
                router.replace("/login");
                return;
            }

            if (code) {
                try {
                    await supabase.auth.exchangeCodeForSession(code);
                    router.replace("/dorms");
                    return;
                } catch {
                    router.replace("/login");
                    return;
                }
            }

            router.replace("/login");
        };

        void run();
    }, [router]);

    return (
        <main style={styles.page}>
            <div style={styles.card}>
                <div style={styles.title}>Signing you in…</div>
                <div style={styles.subtle}>If you canceled, you’ll be sent back to login.</div>
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
