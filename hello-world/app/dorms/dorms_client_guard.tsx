"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DormsClientGuard() {
    const router = useRouter();

    useEffect(() => {
        const hash = window.location.hash || "";
        if (hash.includes("error=access_denied")) {
            // Clear the hash and go back to login
            router.replace("/login");
        }
    }, [router]);

    return null;
}
