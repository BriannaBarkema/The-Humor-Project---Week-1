"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";

const API_BASE = "https://api.almostcrackd.ai";

const SUPPORTED_TYPES = new Set([
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/heic",
]);

type PresignResponse = {
    presignedUrl: string;
    cdnUrl: string;
};

type RegisterResponse = {
    imageId: string;
    now: number;
};

type VoteState = "idle" | "busy" | "upvoted" | "downvoted" | "error";

async function readError(res: Response): Promise<string> {
    const text = await res.text().catch(() => "");
    return `${res.status} ${res.statusText}${text ? ` — ${text}` : ""}`;
}

function normalizeCaption(rec: any): { id: string | null; content: string } {
    const id = rec?.id ?? rec?.caption_id ?? rec?.captionId ?? null;
    const content =
        rec?.content ??
        rec?.caption ??
        rec?.text ??
        rec?.generatedCaption ??
        rec?.generated_caption ??
        "";
    return { id: id ? String(id) : null, content: String(content ?? "") };
}

function isTypingTarget(el: EventTarget | null) {
    if (!(el instanceof HTMLElement)) return false;
    const tag = el.tagName.toLowerCase();
    return tag === "input" || tag === "textarea" || el.isContentEditable;
}

export default function ImageCaptionUploader() {
    const supabase = createClient();
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState<string>("");
    const [error, setError] = useState<string | null>(null);

    const [captions, setCaptions] = useState<Array<{ id: string | null; content: string }> | null>(
        null
    );
    const [idx, setIdx] = useState(0);

    const [voteStates, setVoteStates] = useState<Record<string, VoteState>>({});
    const [voteErrors, setVoteErrors] = useState<Record<string, string | null>>({});

    const supported = useMemo(() => {
        if (!file) return true;
        return SUPPORTED_TYPES.has(file.type);
    }, [file]);

    function resetResults() {
        setCaptions(null);
        setIdx(0);
        setVoteStates({});
        setVoteErrors({});
        setStatus("");
        setError(null);
    }

    function onPickFile(f: File | null) {
        resetResults();
        setFile(f);

        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(f ? URL.createObjectURL(f) : null);
    }

    async function getAccessToken(): Promise<string> {
        const { data, error: sessErr } = await supabase.auth.getSession();
        if (sessErr) throw new Error(sessErr.message);
        const token = data.session?.access_token;
        if (!token) throw new Error("Not authenticated. Please sign in first.");
        return token;
    }

    async function runPipeline() {
        resetResults();

        if (!file) {
            setError("Please choose an image first.");
            return;
        }
        if (!SUPPORTED_TYPES.has(file.type)) {
            setError(`Unsupported file type: ${file.type}`);
            return;
        }

        setBusy(true);
        setStatus("Generating captions...");

        try {
            const token = await getAccessToken();

            // Step 1: presign
            const presignRes = await fetch(`${API_BASE}/pipeline/generate-presigned-url`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ contentType: file.type }),
            });
            if (!presignRes.ok) throw new Error(await readError(presignRes));
            const presign: PresignResponse = await presignRes.json();

            // Step 2: upload bytes
            const putRes = await fetch(presign.presignedUrl, {
                method: "PUT",
                headers: { "Content-Type": file.type },
                body: file,
            });
            if (!putRes.ok) throw new Error(await readError(putRes));

            // Step 3: register
            const registerRes = await fetch(`${API_BASE}/pipeline/upload-image-from-url`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ imageUrl: presign.cdnUrl, isCommonUse: false }),
            });
            if (!registerRes.ok) throw new Error(await readError(registerRes));
            const registered: RegisterResponse = await registerRes.json();

            // Step 4: captions
            const captionsRes = await fetch(`${API_BASE}/pipeline/generate-captions`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ imageId: registered.imageId }),
            });
            if (!captionsRes.ok) throw new Error(await readError(captionsRes));

            const records = await captionsRes.json();
            const arr = (Array.isArray(records) ? records : [records]).map(normalizeCaption);

            setCaptions(arr);
            setIdx(0);

            const initStates: Record<string, VoteState> = {};
            const initErrs: Record<string, string | null> = {};
            for (const c of arr) {
                if (c.id) {
                    initStates[c.id] = "idle";
                    initErrs[c.id] = null;
                }
            }
            setVoteStates(initStates);
            setVoteErrors(initErrs);

            setStatus("");
        } catch (e: any) {
            setError(e?.message ?? String(e));
            setStatus("");
        } finally {
            setBusy(false);
        }
    }

    async function vote(captionId: string, voteValue: 1 | -1) {
        setVoteStates((s) => ({ ...s, [captionId]: "busy" }));
        setVoteErrors((e) => ({ ...e, [captionId]: null }));

        try {
            const res = await fetch("/api/captions/vote_generated", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ caption_id: captionId, vote_value: voteValue }),
            });

            const json = await res.json().catch(() => ({}));

            if (res.status === 409) {
                setVoteStates((s) => ({
                    ...s,
                    [captionId]: voteValue === 1 ? "upvoted" : "downvoted",
                }));
                return;
            }

            if (!res.ok) throw new Error(json?.error ?? "Vote failed");

            setVoteStates((s) => ({
                ...s,
                [captionId]: voteValue === 1 ? "upvoted" : "downvoted",
            }));
        } catch (e: any) {
            setVoteStates((s) => ({ ...s, [captionId]: "error" }));
            setVoteErrors((err) => ({ ...err, [captionId]: e?.message ?? String(e) }));
        }
    }

    const current = captions?.[idx] ?? null;
    const total = captions?.length ?? 0;

    const canPrev = idx > 0;
    const canNext = captions ? idx < captions.length - 1 : false;

    const canVote = Boolean(current?.id);
    const voteState = current?.id ? voteStates[current.id] ?? "idle" : "idle";
    const voteErr = current?.id ? voteErrors[current.id] : null;

    function goPrev() {
        setIdx((i) => Math.max(0, i - 1));
    }
    function goNext() {
        setIdx((i) => (captions ? Math.min(captions.length - 1, i + 1) : i));
    }

    // Keyboard controls: Left/Right nav, Up/Down vote
    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            if (busy) return;
            if (isTypingTarget(e.target)) return;
            if (!captions || captions.length === 0) return;

            if (e.key === "ArrowLeft") {
                e.preventDefault();
                if (canPrev) goPrev();
            } else if (e.key === "ArrowRight") {
                e.preventDefault();
                if (canNext) goNext();
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                if (current?.id && canVote && voteState !== "busy") vote(current.id, 1);
            } else if (e.key === "ArrowDown") {
                e.preventDefault();
                if (current?.id && canVote && voteState !== "busy") vote(current.id, -1);
            }
        }

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [busy, captions, canPrev, canNext, current?.id, canVote, voteState]);

    const fileName = file?.name ?? "No file selected";

    return (
        <main style={styles.page}>
            <div style={styles.column}>
                <div style={styles.header}>
                    <h1 style={styles.h1}>Caption Generator</h1>
                    <p style={styles.subtle}>Upload an image, generate captions, then vote.</p>
                </div>

                <div style={styles.card}>
                    {/* Top bar: left file picker, centered generate button */}
                    <div style={styles.topBar}>
                        <div style={styles.filePicker}>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept={[...SUPPORTED_TYPES].join(",")}
                                disabled={busy}
                                onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
                                style={styles.hiddenFileInput}
                            />

                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => fileInputRef.current?.click()}
                                style={{ ...styles.fileBtn, ...(busy ? styles.btnDisabled : {}) }}
                            >
                                Choose image
                            </button>

                            <div style={styles.fileNamePill} title={fileName}>
                                {fileName}
                            </div>
                        </div>

                        <div style={styles.generateWrap}>
                            <button
                                type="button"
                                disabled={busy || !file || !supported}
                                onClick={runPipeline}
                                style={{ ...styles.btn, ...(busy ? styles.btnDisabled : {}) }}
                            >
                                {busy ? "Working..." : "Generate captions"}
                            </button>
                        </div>

                        <div style={{ width: 1 }} />
                    </div>

                    {!supported && file ? (
                        <div style={styles.errorBox}>
                            <div style={styles.errorTitle}>Unsupported file type</div>
                            <div style={styles.errorText}>
                                <code>{file.type}</code>
                            </div>
                        </div>
                    ) : null}

                    {status ? (
                        <div style={styles.infoBox}>
                            <div style={styles.infoText}>{status}</div>
                        </div>
                    ) : null}

                    {error ? (
                        <div style={styles.errorBox}>
                            <div style={styles.errorTitle}>Error</div>
                            <div style={styles.errorText}>{error}</div>
                        </div>
                    ) : null}

                    {/* Media + caption area with side arrows */}
                    {previewUrl ? (
                        <div style={styles.mediaShell}>
                            {/* left/right arrows (only show when captions exist) */}
                            {captions && captions.length > 0 ? (
                                <>
                                    <button
                                        type="button"
                                        aria-label="Previous caption"
                                        onClick={goPrev}
                                        disabled={!canPrev}
                                        style={{ ...styles.sideArrow, ...styles.sideArrowLeft, ...(!canPrev ? styles.btnDisabled : {}) }}
                                    >
                                        ‹
                                    </button>

                                    <button
                                        type="button"
                                        aria-label="Next caption"
                                        onClick={goNext}
                                        disabled={!canNext}
                                        style={{ ...styles.sideArrow, ...styles.sideArrowRight, ...(!canNext ? styles.btnDisabled : {}) }}
                                    >
                                        ›
                                    </button>
                                </>
                            ) : null}

                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={previewUrl} alt="preview" style={styles.image} />
                        </div>
                    ) : null}

                    {current ? (
                        <div style={styles.captionArea}>
                            <div style={styles.captionLabel}>
                                Caption {idx + 1} of {total}
                                {!current.id ? (
                                    <span style={{ marginLeft: 10, opacity: 0.7, fontWeight: 700 }}>
                    (no id returned — voting disabled)
                  </span>
                                ) : (
                                    <span style={{ marginLeft: 10, opacity: 0.65, fontWeight: 700 }}>
                    (←/→ to navigate, ↑/↓ to vote)
                  </span>
                                )}
                            </div>

                            <div style={styles.captionText}>{current.content || "—"}</div>

                            <div style={styles.voteRow}>
                                <button
                                    type="button"
                                    disabled={!canVote || voteState === "busy"}
                                    onClick={() => current.id && vote(current.id, 1)}
                                    style={{
                                        ...styles.btn,
                                        ...(voteState === "upvoted" ? styles.btnActiveUp : {}),
                                        ...((!canVote || voteState === "busy") ? styles.btnDisabled : {}),
                                    }}
                                >
                                    Upvote
                                </button>

                                <button
                                    type="button"
                                    disabled={!canVote || voteState === "busy"}
                                    onClick={() => current.id && vote(current.id, -1)}
                                    style={{
                                        ...styles.btnSecondary,
                                        ...(voteState === "downvoted" ? styles.btnActiveDown : {}),
                                        ...((!canVote || voteState === "busy") ? styles.btnDisabled : {}),
                                    }}
                                >
                                    Downvote
                                </button>
                            </div>

                            {voteErr ? (
                                <div style={styles.errorBox}>
                                    <div style={styles.errorTitle}>Vote error</div>
                                    <div style={styles.errorText}>{voteErr}</div>
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            </div>
        </main>
    );
}

const styles: Record<string, React.CSSProperties> = {
    page: { padding: 28, maxWidth: 1100, margin: "0 auto" },
    column: { maxWidth: 920, margin: "0 auto" },
    header: { marginBottom: 14 },
    h1: { fontSize: 30, fontWeight: 850, letterSpacing: -0.3, margin: 0, lineHeight: 1.1 },
    subtle: { margin: "6px 0 0 0", opacity: 0.75, fontSize: 14 },

    card: {
        width: "100%",
        borderRadius: 22,
        padding: 18,
        boxSizing: "border-box",
        border: "1px solid rgba(255, 215, 0, 0.22)",
        background:
            "radial-gradient(1200px 500px at 50% -40%, rgba(255,215,0,0.12), rgba(0,0,0,0) 55%), rgba(255,255,255,0.03)",
        boxShadow: "0 18px 55px rgba(0,0,0,0.55)",
    },

    // TOP BAR
    topBar: {
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        alignItems: "center",
        gap: 12,
    },

    filePicker: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        minWidth: 0,
    },

    hiddenFileInput: { display: "none" },

    fileBtn: {
        padding: "10px 14px",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.18)",
        background: "rgba(255,255,255,0.06)",
        color: "inherit",
        fontSize: 14.5,
        fontWeight: 850,
        cursor: "pointer",
        boxShadow: "0 10px 26px rgba(0,0,0,0.25)",
        whiteSpace: "nowrap",
    },

    fileNamePill: {
        minWidth: 0,
        maxWidth: "100%",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        padding: "10px 12px",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(0,0,0,0.25)",
        fontSize: 14,
        fontWeight: 800,
        opacity: 0.92,
    },

    generateWrap: { display: "flex", justifyContent: "center" },

    btn: {
        minWidth: 190,
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
        minWidth: 190,
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

    btnActiveUp: {
        border: "1px solid rgba(120, 255, 180, 0.55)",
        background: "linear-gradient(180deg, rgba(120,255,180,0.18), rgba(120,255,180,0.07))",
    },
    btnActiveDown: {
        border: "1px solid rgba(255, 140, 140, 0.45)",
        background: "linear-gradient(180deg, rgba(255,140,140,0.14), rgba(255,140,140,0.06))",
    },

    mediaShell: {
        position: "relative",
        width: "100%",
        boxSizing: "border-box",
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(0,0,0,0.35)",
        padding: 8,
        display: "grid",
        placeItems: "center",
        marginTop: 14,
        overflow: "hidden",
        maxHeight: "calc(100vh - 360px)",
        height: "calc(100vh - 360px)",
        minHeight: 260,
    },

    image: {
        height: "100%",
        width: "auto",
        maxWidth: "100%",
        maxHeight: "100%",
        objectFit: "contain",
        display: "block",
        borderRadius: 14,
        boxShadow: "0 14px 40px rgba(0,0,0,0.5)",
    },

    sideArrow: {
        position: "absolute",
        top: "50%",
        transform: "translateY(-50%)",
        width: 52,
        height: 52,
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.18)",
        background: "rgba(0,0,0,0.35)",
        color: "inherit",
        fontSize: 34,
        fontWeight: 900,
        lineHeight: "46px",
        display: "grid",
        placeItems: "center",
        cursor: "pointer",
        boxShadow: "0 10px 26px rgba(0,0,0,0.45)",
        userSelect: "none",
    },
    sideArrowLeft: { left: 12 },
    sideArrowRight: { right: 12 },

    captionArea: { marginTop: 16, textAlign: "center" },
    captionLabel: {
        fontSize: 12,
        opacity: 0.75,
        letterSpacing: 0.2,
        textTransform: "uppercase",
        marginBottom: 10,
        fontWeight: 900,
    },
    captionText: { fontSize: 20, fontWeight: 900, letterSpacing: -0.25, lineHeight: 1.25 },

    voteRow: { display: "flex", justifyContent: "center", gap: 10, marginTop: 12, flexWrap: "wrap" },

    infoBox: {
        marginTop: 12,
        borderRadius: 14,
        border: "1px solid rgba(100,180,255,0.25)",
        background: "rgba(100,180,255,0.08)",
        padding: 12,
        boxSizing: "border-box",
    },
    infoText: { fontSize: 13, opacity: 0.9, lineHeight: 1.35 },

    errorBox: {
        marginTop: 12,
        borderRadius: 14,
        border: "1px solid rgba(255,120,120,0.35)",
        background: "rgba(255,120,120,0.08)",
        padding: 12,
        boxSizing: "border-box",
        textAlign: "left",
    },
    errorTitle: { fontSize: 12, fontWeight: 900, marginBottom: 6, textTransform: "uppercase" },
    errorText: { fontSize: 13, opacity: 0.9, lineHeight: 1.35 },
};