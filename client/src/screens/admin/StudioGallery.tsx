import { useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";
import { api, type StudioPhoto } from "../../lib/api";
import { fileToDataUrl, MAX_IMAGE_MB } from "../../lib/upload";

export default function StudioGallery() {
  const { flash } = useApp();
  const [photos, setPhotos] = useState<StudioPhoto[]>([]);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function reload() {
    api.studioPhotos().then(setPhotos).catch((e) => flash(e instanceof Error ? e.message : "Couldn't load photos"));
  }
  useEffect(reload, []);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) { flash(`Please choose a photo under ${MAX_IMAGE_MB}MB`); return; }
    setBusy(true);
    try {
      const imageUrl = await fileToDataUrl(file);
      await api.adminStudioPhotos.create({ imageUrl, caption });
      setCaption("");
      flash("Photo added");
      reload();
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not upload photo");
    } finally {
      setBusy(false);
    }
  }

  async function remove(p: StudioPhoto) {
    if (!window.confirm("Remove this photo?")) return;
    setDeletingId(p.id);
    try {
      await api.adminStudioPhotos.delete(p.id);
      flash("Photo removed");
      reload();
    } catch (e) {
      flash(e instanceof Error ? e.message : "Could not remove photo");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <div style={{ fontSize: 13.5, color: "var(--color-neutral-700)", marginTop: 4, marginBottom: 16 }}>
        Photos shown in the studio gallery on the customer home page. Until you add real ones, guests see tasteful placeholders instead.
      </div>

      <div style={{ background: "var(--color-neutral-100)", borderRadius: "var(--radius-lg)", padding: 18, marginBottom: 20 }}>
        <div className="field">
          <label htmlFor="sg-caption">Caption (optional)</label>
          <input className="input" id="sg-caption" placeholder="e.g. Studio A, sunrise practice" value={caption} onChange={(e) => setCaption(e.target.value)} />
        </div>
        <div className="field" style={{ marginTop: 12 }}>
          <label htmlFor="sg-file">{busy ? "Uploading…" : `Upload photo — JPG or PNG, up to ${MAX_IMAGE_MB}MB`}</label>
          <input className="input" id="sg-file" type="file" accept="image/*" disabled={busy} onChange={onUpload} style={{ borderRadius: "var(--radius-sm)", padding: "10px 14px" }} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
        {photos.map((p) => (
          <div key={p.id} style={{ position: "relative", borderRadius: "var(--radius-md)", overflow: "hidden", background: "var(--color-neutral-100)", boxShadow: "var(--shadow-sm)" }}>
            <img src={p.imageUrl} alt={p.caption || "Studio photo"} style={{ width: "100%", height: 130, objectFit: "cover", display: "block" }} />
            <div style={{ padding: "10px 12px" }}>
              <div style={{ fontSize: 12.5, fontWeight: 600 }}>{p.caption || "Untitled"}</div>
              <button className="btn btn-ghost" style={{ marginTop: 6, padding: "6px 0", fontSize: 12, color: "var(--color-accent-700)" }} disabled={deletingId === p.id} onClick={() => remove(p)}>
                {deletingId === p.id ? "Removing…" : "Remove"}
              </button>
            </div>
          </div>
        ))}
        {photos.length === 0 && <div style={{ fontSize: 13, color: "var(--color-neutral-600)" }}>No photos yet — placeholders are showing on the home page.</div>}
      </div>
    </>
  );
}
