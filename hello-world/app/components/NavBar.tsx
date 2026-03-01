"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

function isActive(pathname: string, href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
}

export default function NavBar() {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();

    // Hide navbar on login page
    if (pathname === "/login" || pathname.startsWith("/login/")) return null;

    async function onLogout() {
        await supabase.auth.signOut();
        router.push("/login");
    }

    const links = [
        { href: "/dorms", label: "Dorms" },
        { href: "/captions", label: "Caption Vote" },
        { href: "/caption_generate", label: "Image Upload" },
    ];

    return (
        <header className="ac-nav">
            <div className="ac-nav-inner">
                <div className="ac-brand">
                    <span className="ac-dot" />
                    <span className="ac-title">AlmostCrackd</span>
                </div>

                <nav className="ac-links" aria-label="Primary navigation">
                    {links.map((l) => {
                        const active = isActive(pathname, l.href);
                        return (
                            <Link
                                key={l.href}
                                href={l.href}
                                className={`ac-link ${active ? "ac-link-active" : ""}`}
                            >
                                {l.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="ac-actions">
                    <button className="ac-logout" type="button" onClick={onLogout}>
                        Log out
                    </button>
                </div>
            </div>
        </header>
    );
}