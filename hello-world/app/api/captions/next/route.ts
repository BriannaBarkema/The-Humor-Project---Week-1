import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

type CaptionJoinRow = {
    id: string;
    content: string | null;
    image_id: string | null;
    images: { id: string; url: string | null; is_public: boolean | null } | null;
};

export async function GET(request: Request) {
    const supabase = await createClient();

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = userData.user.id;

    const url = new URL(request.url);
    const after = (url.searchParams.get("after") ?? "").trim();

    // 1) Get all caption_ids this user has already voted on
    const { data: votedRows, error: votedErr } = await supabase
        .from("caption_votes")
        .select("caption_id")
        .eq("profile_id", userId)
        .limit(5000);

    if (votedErr) {
        return NextResponse.json({ error: votedErr.message }, { status: 500 });
    }

    const votedIds = (votedRows ?? [])
        .map((r: any) => String(r.caption_id))
        .filter(Boolean);

    // 2) List candidate caption ids: image must exist + be public, and caption not voted by this user
    // Force INNER JOIN with images!inner so captions without visible/public images are excluded.
    let listQuery = supabase
        .from("captions")
        .select("id, images!inner(id, is_public)")
        .eq("images.is_public", true)
        .order("id", { ascending: true })
        .limit(500);

    if (votedIds.length > 0) {
        listQuery = listQuery.not("id", "in", `(${votedIds.map((x) => `"${x}"`).join(",")})`);
    }

    const { data: candidates, error: listErr } = await listQuery;

    if (listErr) {
        return NextResponse.json({ error: listErr.message }, { status: 500 });
    }

    const ids = (candidates ?? []).map((r: any) => String(r.id)).filter(Boolean);

    if (ids.length === 0) {
        return NextResponse.json(
            { error: "No remaining captions with public images to vote on" },
            { status: 404 }
        );
    }

    // 3) Pick next id after the current caption, wrapping around
    const idx = after ? ids.findIndex((x) => x === after) : -1;
    const nextId = idx >= 0 ? ids[(idx + 1) % ids.length] : ids[0];

    // 4) Fetch the caption + image url (inner join + public filter again for safety)
    const { data: row, error: rowErr } = await supabase
        .from("captions")
        .select("id, content, image_id, images!inner(id, url, is_public)")
        .eq("id", nextId)
        .eq("images.is_public", true)
        .limit(1)
        .maybeSingle<CaptionJoinRow>();

    if (rowErr) {
        return NextResponse.json({ error: rowErr.message }, { status: 500 });
    }

    if (!row?.images?.url) {
        return NextResponse.json(
            { error: "Caption not found or image not public" },
            { status: 404 }
        );
    }

    return NextResponse.json(
        {
            caption: {
                id: row.id,
                content: row.content ?? "",
                image_id: row.image_id ?? null,
            },
            image: { id: row.images.id, url: row.images.url },
        },
        { status: 200 }
    );
}
