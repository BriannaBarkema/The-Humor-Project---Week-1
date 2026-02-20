"use client";

import { useMemo, useState } from "react";

type NextPayload = {
    caption: { id: string; content: string; image_id: string | null };
    image: { id: string; url: string } | null;
};

export default function CaptionRater(props: {
    initialCaptionId: string;
    initialCaptionContent: string;
    initialImageUrl: string;
    profileId: string;
}) {
    const [captionId, setCaptionId] = useState<string>(props.initialCaptionId);
    const [captionContent, setCaptionContent] = useState<string>(props.initialCaptionContent);
    const [imageUrl, setImageUrl] = useState<string>(props.initialImageUrl);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const hasImage = useMemo(() => Boolean(imageUrl && imageUrl.trim().length > 0), [imageUrl]);

    async function loadNext(afterCaptionId: string) {
        const res = await fetch(`/api/captions/next?after=${encodeURIComponent(afterCaptionId)}`, {
            cache: "no-store",
        });
        const json = await res.json();

        if (!res.ok) throw new Error(json?.error ?? "Failed to load next caption");

        const payload = json as NextPayload;
        setCaptionId(payload.caption.id);
        setCaptionContent(payload.caption.content ?? "");
        setImageUrl(payload.image?.url ?? "");
    }

    async function vote(voteValue: 1 | -1) {
        if (busy) return;
        setBusy(true);
        setError(null);

        try {
            const res = await fetch("/api/captions/vote", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    vote_value: voteValue,
                    caption_id: captionId,
                    after: captionId,
                }),
            });

            const json = await res.json();

            if (res.status === 409) {
                await loadNext(captionId);
                return;
            }

            if (!res.ok) throw new Error(json?.error ?? "Vote failed");

            const payload = json as NextPayload;
            setCaptionId(payload.caption.id);
            setCaptionContent(payload.caption.content ?? "");
            setImageUrl(payload.image?.url ?? "");
        } catch (e: any) {
            setError(e?.message ?? String(e));
            try {
                await loadNext(captionId);
            } catch {
                // ignore
            }
        } finally {
            setBusy(false);
        }
    }

    return (
        <div style={styles.wrap}>
            <div style={styles.card}>
                <div style={styles.mediaShell}>
                    {hasImage ? (
                        <img src={imageUrl} alt="Caption image" style={styles.image} />
                    ) : (
                        <div style={styles.missing}>
                            <div style={styles.missingTitle}>Image unavailable</div>
                            <div style={styles.missingSubtle}>This caption has no public image URL.</div>
                        </div>
                    )}
                </div>

                <div style={styles.captionBlock}>
                    <div style={styles.captionLabel}>Caption</div>
                    <div style={styles.captionText}>{captionContent || "—"}</div>
                </div>

                <div style={styles.actionsRow}>
                    <button
                        type="button"
                        onClick={() => vote(1)}
                        disabled={busy}
                        style={{ ...styles.btn, ...(busy ? styles.btnDisabled : {}) }}
                    >
                        Upvote
                    </button>

                    <button
                        type="button"
                        onClick={() => vote(-1)}
                        disabled={busy}
                        style={{ ...styles.btnSecondary, ...(busy ? styles.btnDisabled : {}) }}
                    >
                        Downvote
                    </button>
                </div>

                {error ? (
                    <div style={styles.errorBox}>
                        <div style={styles.errorTitle}>Error</div>
                        <div style={styles.errorText}>{error}</div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    wrap: {
        width: "100%",
        display: "block",
        boxSizing: "border-box",
    },

    card: {
        width: "min(920px, 100%)",
        margin: "0 auto",
        borderRadius: 22,
        padding: 18,
        boxSizing: "border-box", // important
        border: "1px solid rgba(255, 215, 0, 0.22)",
        background:
            "radial-gradient(1200px 500px at 50% -40%, rgba(255,215,0,0.12), rgba(0,0,0,0) 55%), rgba(255,255,255,0.03)",
        boxShadow: "0 18px 55px rgba(0,0,0,0.55)",
    },

    mediaShell: {
        width: "100%",
        boxSizing: "border-box", // fixes overflow caused by border+padding
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(0,0,0,0.35)",
        padding: 12,
        display: "grid",
        placeItems: "center",
        marginBottom: 14,
    },

    image: {
        maxWidth: "100%",
        maxHeight: "min(52vh, 420px)",
        width: "auto",
        height: "auto",
        objectFit: "contain",
        display: "block",
        borderRadius: 14,
        boxShadow: "0 14px 40px rgba(0,0,0,0.5)",
    },

    missing: {
        width: "100%",
        boxSizing: "border-box", // same issue here
        minHeight: 220,
        borderRadius: 14,
        border: "1px dashed rgba(255, 215, 0, 0.28)",
        background: "rgba(255, 215, 0, 0.06)",
        display: "grid",
        placeItems: "center",
        padding: 18,
        textAlign: "center",
    },
    missingTitle: { fontSize: 16, fontWeight: 900, marginBottom: 6 },
    missingSubtle: { opacity: 0.8, fontSize: 13.5 },

    captionBlock: {
        textAlign: "center",
        padding: "4px 10px 0 10px",
        marginBottom: 14,
        boxSizing: "border-box",
    },
    captionLabel: {
        fontSize: 12,
        opacity: 0.75,
        letterSpacing: 0.2,
        textTransform: "uppercase",
        marginBottom: 8,
    },
    captionText: {
        fontSize: 20,
        fontWeight: 850,
        letterSpacing: -0.25,
        lineHeight: 1.25,
    },

    actionsRow: {
        display: "flex",
        justifyContent: "center",
        gap: 10,
        flexWrap: "wrap",
        paddingBottom: 2,
    },

    btn: {
        minWidth: 150,
        padding: "10px 14px",
        borderRadius: 14,
        border: "1px solid rgba(255, 215, 0, 0.55)",
        background: "linear-gradient(180deg, rgba(255,215,0,0.22), rgba(255,215,0,0.10))",
        color: "inherit",
        fontSize: 14.5,
        fontWeight: 850,
        cursor: "pointer",
        boxShadow: "0 10px 26px rgba(0,0,0,0.35)",
    },

    btnSecondary: {
        minWidth: 150,
        padding: "10px 14px",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(255,255,255,0.06)",
        color: "inherit",
        fontSize: 14.5,
        fontWeight: 850,
        cursor: "pointer",
        boxShadow: "0 10px 26px rgba(0,0,0,0.35)",
    },

    btnDisabled: { opacity: 0.55, cursor: "not-allowed" },

    errorBox: {
        marginTop: 14,
        borderRadius: 14,
        border: "1px solid rgba(255,120,120,0.35)",
        background: "rgba(255,120,120,0.08)",
        padding: 12,
        boxSizing: "border-box",
    },
    errorTitle: {
        fontSize: 12,
        fontWeight: 900,
        marginBottom: 6,
        textTransform: "uppercase",
        letterSpacing: 0.2,
    },
    errorText: { fontSize: 13, opacity: 0.9, lineHeight: 1.35 },
};