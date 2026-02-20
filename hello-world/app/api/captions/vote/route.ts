import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {SupabaseClient} from "@supabase/supabase-js";

type VoteBody = {
    vote_value: 1 | -1;
    caption_id: string;
    after?: string;
};

type CaptionJoinRow = {
    id: string;
    content: string | null;
    image_id: string | null;
    images: { id: string; url: string | null; is_public: boolean | null } | null;
};

async function getNextUnvotedPublic(
    supabase: SupabaseClient,
    userId: string,
    afterId: string
) {
    // voted caption ids for this user
    const { data: votedRows, error: votedErr } = await supabase
        .from("caption_votes")
        .select("caption_id")
        .eq("profile_id", userId)
        .limit(5000);

    if (votedErr) throw new Error(votedErr.message);

    const votedIds = (votedRows ?? [])
        .map((r: any) => String(r.caption_id))
        .filter(Boolean);

    // candidate ids: public images + not voted
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
    if (listErr) throw new Error(listErr.message);

    const ids = (candidates ?? []).map((r: any) => String(r.id)).filter(Boolean);
    if (ids.length === 0) throw new Error("No remaining captions with public images to vote on");

    const idx = afterId ? ids.findIndex((x) => x === afterId) : -1;
    const nextId = idx >= 0 ? ids[(idx + 1) % ids.length] : ids[0];

    const { data: row, error: rowErr } = await supabase
        .from("captions")
        .select("id, content, image_id, images!inner(id, url, is_public)")
        .eq("id", nextId)
        .eq("images.is_public", true)
        .limit(1)
        .maybeSingle<CaptionJoinRow>();

    if (rowErr) throw new Error(rowErr.message);
    if (!row?.images?.url) throw new Error("Caption not found or image not public");

    return {
        caption: {
            id: row.id,
            content: row.content ?? "",
            image_id: row.image_id ?? null,
        },
        image: { id: row.images.id, url: row.images.url },
    };
}

export async function POST(request: Request) {
    const supabase = await createClient();

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = userData.user.id;

    const body = (await request.json()) as VoteBody;
    const captionId = String(body.caption_id ?? "").trim();

    if (!captionId) {
        return NextResponse.json({ error: "Invalid caption_id" }, { status: 400 });
    }

    const voteValue: 1 | -1 = body.vote_value === 1 ? 1 : -1;

    const now = new Date().toISOString();

    const { error: insErr } = await supabase.from("caption_votes").insert([
        {
            vote_value: voteValue,
            profile_id: userId,
            caption_id: captionId,
            created_datetime_utc: now,
            modified_datetime_utc: now,
        },
    ]);

    if (insErr) {
        // Handle your unique constraint nicely (don’t break the flow)
        const msg = insErr.message ?? "";
        if (msg.toLowerCase().includes("duplicate") || msg.includes("caption_votes_user_caption_unique")) {
            return NextResponse.json(
                { error: "You already voted on this caption." },
                { status: 409 }
            );
        }
        return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    try {
        const afterId = String(body.after ?? captionId);
        const payload = await getNextUnvotedPublic(supabase, userId, afterId);
        return NextResponse.json(payload, { status: 200 });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
    }
}
