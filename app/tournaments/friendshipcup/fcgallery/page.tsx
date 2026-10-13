"use client";

import { useCallback, useEffect, useState } from "react";
import SectionShell from "../SectionShell";
import { supabase } from "@/lib/supabase/client";

type GalleryPhoto = { name: string; url: string; season: string };

const seasons = ["Season 1", "Season 2", "Season 3", "Season 4", "Season 5", "Season 6", "Season 7"];

export default function GalleryPage() {
  const [season, setSeason] = useState("All Seasons");
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [galleryError, setGalleryError] = useState("");

  const loadPhotos = useCallback(async () => {
    setLoading(true);
    setGalleryError("");
    const selectedSeasons = season === "All Seasons" ? seasons : [season];
    const results: GalleryPhoto[] = [];
    for (const item of selectedSeasons) {
      const folder = item.toLowerCase().replace(" ", "-");
      const { data, error } = await supabase.storage.from("fc-gallery").list(folder, {
        limit: 100,
        sortBy: { column: "created_at", order: "desc" },
      });
      if (error) {
        setGalleryError('Gallery storage is not configured yet. Create a public Supabase Storage bucket named "fc-gallery".');
        continue;
      }
      for (const file of data ?? []) {
        if (!file.name || file.name.startsWith(".")) continue;
        const { data: publicData } = supabase.storage.from("fc-gallery").getPublicUrl(`${folder}/${file.name}`);
        results.push({ name: file.name, url: publicData.publicUrl, season: item });
      }
    }
    setPhotos(results);
    setLoading(false);
  }, [season]);

  useEffect(() => { void loadPhotos(); }, [loadPhotos]);

  return <SectionShell title="Friendship Cup Gallery" description="Browse photos and memories from Friendship Cup seasons.">
    <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
      <label className="flex max-w-xs flex-col gap-2 text-sm font-bold text-slate-300">Filter by season
        <select value={season} onChange={e => setSeason(e.target.value)} className="rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-white">
          <option>All Seasons</option>{seasons.map(s => <option key={s}>{s}</option>)}
        </select>
      </label>
    </div>
    {galleryError && <p role="status" className="mt-5 rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-200">{galleryError}</p>}
    {loading ? <p className="py-12 text-center text-slate-400">Loading gallery…</p> :
      photos.length ? <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {photos.map(photo => <figure key={`${photo.season}/${photo.name}`} className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
          <img src={photo.url} alt={`Friendship Cup ${photo.season} memory`} loading="lazy" className="aspect-[4/3] w-full object-cover" />
          <figcaption className="px-4 py-3 text-sm font-semibold text-slate-300">{photo.season}</figcaption>
        </figure>)}
      </div> : <div className="mt-6 rounded-2xl border border-dashed border-white/15 px-5 py-16 text-center">
        <div className="text-4xl" aria-hidden="true">📸</div>
        <h2 className="mt-4 text-xl font-extrabold text-white">{season === "All Seasons" ? "Friendship Cup memories" : `${season} gallery`}</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-400">No photos have been uploaded for this selection yet.</p>
      </div>}
  </SectionShell>;
}
