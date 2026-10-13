import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const photo = formData.get("photo");
    const season = String(formData.get("season") ?? "Season 7");

    if (!(photo instanceof File)) {
      return NextResponse.json({ error: "Choose a photo to upload." }, { status: 400 });
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(photo.type)) {
      return NextResponse.json({ error: "Only JPG, PNG, and WebP photos are supported." }, { status: 415 });
    }
    if (photo.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: "Photo must be 8 MB or smaller." }, { status: 413 });
    }
    if (!/^Season [1-7]$/.test(season)) {
      return NextResponse.json({ error: "Invalid season." }, { status: 400 });
    }

    const extension = photo.type === "image/jpeg" ? "jpg" : photo.type === "image/png" ? "png" : "webp";
    const safeName = `${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const path = `${season.toLowerCase().replace(" ", "-")}/${safeName}`;
    const { error } = await supabaseAdmin.storage.from("fc-gallery").upload(path, photo, {
      contentType: photo.type,
      cacheControl: "3600",
      upsert: false,
    });

    if (error) {
      return NextResponse.json({
        error: error.message.includes("Bucket not found")
          ? 'Supabase Storage bucket "fc-gallery" must be created and set to public.'
          : "Could not upload photo. Check the fc-gallery bucket and service-role configuration.",
      }, { status: 500 });
    }

    return NextResponse.json({ success: true, path });
  } catch {
    return NextResponse.json({ error: "Unable to process the photo upload." }, { status: 500 });
  }
}
