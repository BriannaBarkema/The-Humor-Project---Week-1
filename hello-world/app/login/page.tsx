"use client";

import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
    const supabase = createClient();

    const signInWithGoogle = async () => {
        const origin =
            typeof window !== "undefined" ? window.location.origin : "";

        const redirectTo = `${origin}/auth/callback`;

        await supabase.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo },
        });
    };

    return (
        <main style={{ padding: 24 }}>
            <h1>Sign in</h1>
            <p>You must sign in to access the dashboard.</p>

            <button onClick={signInWithGoogle}>
                Continue with Google
            </button>
        </main>
    );
}
