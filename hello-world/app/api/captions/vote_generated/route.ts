import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: Request) {
    const supabase = await createClient();

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = userData.user.id;

    let body: any;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const captionId = String(body?.caption_id ?? "").trim();
    const voteValueRaw = body?.vote_value;

    const voteValue =
        voteValueRaw === 1 || voteValueRaw === -1 ? (voteValueRaw as 1 | -1) : null;

    if (!captionId) {
        return NextResponse.json({ error: "caption_id is required" }, { status: 400 });
    }

    if (!voteValue) {
        return NextResponse.json({ error: "vote_value must be 1 or -1" }, { status: 400 });
    }

    const createdUtcIso = new Date().toISOString();

    const { error } = await supabase.from("caption_votes").insert({
        profile_id: userId,
        caption_id: captionId,
        vote_value: voteValue,
        created_datetime_utc: createdUtcIso,
    });

    if (error) {
        const msg = (error as any)?.message ?? "";
        const code = (error as any)?.code ?? "";
        if (code === "23505" || msg.toLowerCase().includes("duplicate")) {
            return NextResponse.json({ error: "Already voted" }, { status: 409 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
}