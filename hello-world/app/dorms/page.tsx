import { headers } from "next/headers";

type Dorm = {
    id: number;
    full_name: string | null;
    short_name: string | null;
    university_id: number | null;
    created_at: string | null;
    updated_at: string | null;
};

function formatISODate(iso: string | null) {
    if (!iso) return "—";
    const datePart = iso.slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : "—";
}

async function getDorms(): Promise<Dorm[]> {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "http";
    const baseUrl = host ? `${proto}://${host}` : "http://localhost:3000";

    const res = await fetch(`${baseUrl}/api/dorms`, { cache: "no-store" });
    const json = await res.json();

    if (!res.ok) {
        throw new Error(json?.error ?? "Failed to fetch dorms");
    }

    return (json.data ?? []) as Dorm[];
}

export default async function DormsPage() {
    const dorms = await getDorms();

    return (
        <main style={styles.page}>
            <div style={styles.header}>
                <div>
                    <h1 style={styles.h1}>Dorms</h1>
                    <p style={styles.subtle}>
                        Showing <strong>{dorms.length}</strong> results
                    </p>
                </div>
            </div>

            {dorms.length === 0 ? (
                <div style={styles.empty}>
                    <div style={styles.emptyTitle}>No dorms found</div>
                    <div style={styles.subtle}>Try adding rows in Supabase, then refresh.</div>
                </div>
            ) : (
                <section style={styles.grid}>
                    {dorms.map((dorm) => (
                        <article key={dorm.id} style={styles.card}>
                            <div style={styles.cardTop}>
                                <div style={{ minWidth: 0 }}>
                                    <div style={styles.cardTitle} title={dorm.full_name ?? ""}>
                                        {dorm.full_name ?? "Unnamed dorm"}
                                    </div>

                                    <div style={styles.cardSubtitle}>
                                        {dorm.short_name ? (
                                            <>
                                                <span style={styles.badge}>Short name</span>
                                                <span style={styles.mono}>{dorm.short_name}</span>
                                            </>
                                        ) : (
                                            <span style={styles.subtle}>No short name</span>
                                        )}
                                    </div>
                                </div>

                                <div style={styles.idPill}>
                                    <span style={styles.idLabel}>ID</span>
                                    <span style={styles.idValue}>{dorm.id}</span>
                                </div>
                            </div>

                            <div style={styles.divider} />

                            <dl style={styles.metaGrid}>
                                <div style={styles.metaItem}>
                                    <dt style={styles.metaLabel}>University ID</dt>
                                    <dd style={styles.metaValue}>
                                        {dorm.university_id ?? "—"}
                                    </dd>
                                </div>

                                <div style={styles.metaItem}>
                                    <dt style={styles.metaLabel}>Created</dt>
                                    <dd style={styles.metaValue}>{formatISODate(dorm.created_at)}</dd>
                                </div>

                                <div style={styles.metaItem}>
                                    <dt style={styles.metaLabel}>Updated</dt>
                                    <dd style={styles.metaValue}>{formatISODate(dorm.updated_at)}</dd>
                                </div>
                            </dl>
                        </article>
                    ))}
                </section>
            )}
        </main>
    );
}

const styles: Record<string, React.CSSProperties> = {
    page: {
        padding: 28,
        maxWidth: 1100,
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
    emptyTitle: {
        fontSize: 16,
        fontWeight: 700,
        marginBottom: 6,
    },
    grid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: 14,
    },
    card: {
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(255,255,255,0.04)",
        borderRadius: 16,
        padding: 16,
        boxShadow: "0 8px 22px rgba(0,0,0,0.25)",
    },
    cardTop: {
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 12,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 800,
        letterSpacing: -0.2,
        marginBottom: 8,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
    },
    cardSubtitle: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
        fontSize: 13.5,
        opacity: 0.9,
    },
    badge: {
        fontSize: 11.5,
        padding: "3px 8px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(255,255,255,0.06)",
        opacity: 0.95,
    },
    mono: {
        fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        opacity: 0.95,
    },
    idPill: {
        flexShrink: 0,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(255,255,255,0.06)",
        borderRadius: 12,
        padding: "8px 10px",
        textAlign: "right",
        minWidth: 76,
    },
    idLabel: {
        display: "block",
        fontSize: 11,
        opacity: 0.7,
        marginBottom: 2,
    },
    idValue: {
        display: "block",
        fontSize: 16,
        fontWeight: 800,
        letterSpacing: -0.2,
    },
    divider: {
        height: 1,
        background: "rgba(255,255,255,0.10)",
        margin: "14px 0",
    },
    metaGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: 12,
        margin: 0,
    },
    metaItem: {
        margin: 0,
        minWidth: 0,
    },
    metaLabel: {
        fontSize: 11.5,
        opacity: 0.7,
        marginBottom: 4,
    },
    metaValue: {
        fontSize: 14,
        fontWeight: 600,
        margin: 0,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
    },
};