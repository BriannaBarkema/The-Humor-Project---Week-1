import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({ request });

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

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const isProtected = request.nextUrl.pathname.startsWith("/dashboard");
    if (isProtected && !user) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        url.search = ""; // keep it clean
        return NextResponse.redirect(url);
    }

    return response;
}

export const config = {
    matcher: ["/dashboard/:path*"],
};
