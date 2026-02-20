import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import CaptionRater from "./CaptionRater";

type CaptionJoinRow = {
    id: string;
    content: string | null;
    image_id: string | null;
    images: { id: string; url: string | null; is_public: boolean | null } | null;
};

async function getInitialConstrainedCaption(userId: string) {
    const supabase = await createClient();

    const { data: votedRows, error: votedErr } = await supabase
        .from("caption_votes")
        .select("caption_id")
        .eq("profile_id", userId)
        .limit(5000);

    if (votedErr) throw new Error(votedErr.message);

    const votedIds = (votedRows ?? [])
        .map((r: any) => String(r.caption_id))
        .filter(Boolean);

    let q = supabase
        .from("captions")
        .select("id, content, image_id, images!inner(id, url, is_public)")
        .eq("images.is_public", true)
        .order("id", { ascending: true })
        .limit(1);

    if (votedIds.length > 0) {
        q = q.not("id", "in", `(${votedIds.map((x) => `"${x}"`).join(",")})`);
    }

    const { data: row, error: rowErr } = await q.maybeSingle<CaptionJoinRow>();

    if (rowErr) throw new Error(rowErr.message);
    if (!row?.images?.url) return null;

    return {
        caption: { id: row.id, content: row.content ?? "", image_id: row.image_id ?? null },
        image: { id: row.images.id, url: row.images.url },
    };
}

export default async function CaptionsPage() {
    const supabase = await createClient();
    const { data: userData, error: userErr } = await supabase.auth.getUser();

    if (userErr || !userData.user) {
        redirect("/login");
    }

    const userId = userData.user.id;
    const initial = await getInitialConstrainedCaption(userId);

    return (
        <main style={styles.page}>
            <div style={styles.column}>
                <div style={styles.header}>
                    <div>
                        <h1 style={styles.h1}>Captions</h1>
                        <p style={styles.subtle}>Vote on captions and move to the next one.</p>
                    </div>
                </div>

                {!initial ? (
                    <div style={styles.empty}>
                        <div style={styles.emptyTitle}>Nothing left to vote on</div>
                        <div style={styles.subtle}>
                            No captions remain with public images that you haven’t voted on.
                        </div>
                    </div>
                ) : (
                    <CaptionRater
                        initialCaptionId={initial.caption.id}
                        initialCaptionContent={initial.caption.content}
                        initialImageUrl={initial.image.url}
                        profileId={userId}
                    />
                )}
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

    // NEW: single centered column so header and card align
    column: {
        maxWidth: 920,
        margin: "0 auto",
    },

    header: {
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 16,
        marginBottom: 18,
    },
    h1: {
        fontSize: 30,
        fontWeight: 800,
        letterSpacing: -0.3,
        margin: 0,
        lineHeight: 1.1,
    },
    subtle: {
        margin: "6px 0 0 0",
        opacity: 0.75,
        fontSize: 14,
    },
    empty: {
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(255,255,255,0.04)",
        borderRadius: 16,
        padding: 18,
    },
    emptyTitle: { fontSize: 16, fontWeight: 700, marginBottom: 6 },
};