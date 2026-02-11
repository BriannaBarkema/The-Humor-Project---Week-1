"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function AuthCallbackPage() {
    const router = useRouter();

    useEffect(() => {
        const run = async () => {
            const supabase = createClient();

            const url = new URL(window.location.href);
            const code = url.searchParams.get("code");

            // If the provider redirected back with an error, it may be in the hash
            const hash = window.location.hash || "";
            const hasErrorInHash = hash.includes("error=");

            if (hasErrorInHash) {
                router.replace("/login");
                return;
            }

            // If we got an auth code, exchange it for a session
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

            // No code and no usable info -> go back to login
            router.replace("/login");
        };

        void run();
    }, [router]);

    return (
        <main style={{ padding: 28, maxWidth: 1100, margin: "0 auto" }}>
    <div
        style={{
        border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.04)",
            borderRadius: 16,
            padding: 18,
            boxShadow: "0 8px 22px rgba(0,0,0,0.25)",
    }}
>
    <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.2 }}>
    Signing you in…
        </div>
        <div style={{ marginTop: 8, opacity: 0.75, fontSize: 14 }}>
    If this takes more than a moment, you’ll be sent back to login.
    </div>
    </div>
    </main>
);
}

