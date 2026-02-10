import { createClient } from "@/utils/supabase/server";

export default async function DashboardPage() {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();

    if (!data.user) {
        return (
            <main style={{ padding: 24 }}>
                <h1>Unauthorized</h1>
                <p>Please sign in.</p>
            </main>
        );
    }

    return (
        <main style={{ padding: 24 }}>
            <h1>Dashboard</h1>
            <p>Welcome, {data.user.email}</p>
            <p>This UI is gated behind Google OAuth.</p>
        </main>
    );
}
