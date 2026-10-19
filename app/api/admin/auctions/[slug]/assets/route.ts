import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Context = { params: Promise<{ slug: string }> };
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(request: Request, { params }: Context) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }
  const { slug } = await params;
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "A valid multipart file upload is required." }, { status: 400 });
  }
  const file = formData.get("file");
  const assetType = formData.get("assetType");
  if (!(file instanceof File) || !["team", "sponsor", "background", "tournament", "organizer"].includes(String(assetType))) {
    return NextResponse.json({ error: "Choose a team, sponsor, or background image to upload." }, { status: 400 });
  }
  if (!MIME_EXTENSIONS[file.type] || file.size < 1 || file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "Use a JPG, PNG, or WebP image up to 5 MB." }, { status: 400 });
  }
  const { data: tournament, error: lookupError } = await supabaseAdmin
    .from("auction_tournaments").select("id").eq("slug", slug).maybeSingle();
  if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 500 });
  if (!tournament) return NextResponse.json({ error: "Auction tournament not found." }, { status: 404 });

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-100) || "image";
  const path = `${slug}/${assetType}/${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabaseAdmin.storage.from("auction-assets").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) return NextResponse.json({ error: `Unable to upload image: ${error.message}` }, { status: 500 });
  const { data } = supabaseAdmin.storage.from("auction-assets").getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl }, { status: 201 });
}
