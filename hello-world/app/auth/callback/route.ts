import { NextResponse, NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

function safeNext(raw: string | null) {
    if (!raw) return "/dorms";
    if (!raw.startsWith("/")) return "/dorms";
    if (raw.startsWith("/auth")) return "/dorms";
    return raw;
}

export async function GET(request: NextRequest) {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const origin = url.origin;

    // Read desired post-login destination from cookie (set on /login)
    const nextCookie = request.cookies.get("post_login_redirect")?.value ?? null;
    const nextPath = safeNext(nextCookie ? decodeURIComponent(nextCookie) : null);

    if (!code) {
        // Cancel/deny → go back to login, keep intent
        const res = NextResponse.redirect(`${origin}/login?next=${encodeURIComponent(nextPath)}`);
        res.cookies.set("post_login_redirect", "", { path: "/", maxAge: 0 });
        return res;
    }

    const response = NextResponse.redirect(`${origin}${nextPath}`);

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll: () => request.cookies.getAll(),
                setAll: (cookiesToSet) => {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        response.cookies.set(name, value, options);
                    });
                },
            },
        }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    // Always clear the intent cookie after callback
    response.cookies.set("post_login_redirect", "", { path: "/", maxAge: 0 });

    if (error) {
        return NextResponse.redirect(`${origin}/login?next=${encodeURIComponent(nextPath)}`);
    }

    return response;
}
