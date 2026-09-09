import Sheet from "./Sheet";
import QrGraphic from "./QrGraphic";
import { useApp } from "../context/AppContext";

export default function QrSheet({ booking }: { booking: { title: string; meta: string; ref: string } }) {
  const { closeSheet } = useApp();
  return (
    <Sheet onClose={closeSheet} maxHeight="90%">
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: "var(--font-heading)", fontSize: 23, lineHeight: 1.15 }}>{booking.title}</div>
        <div style={{ fontSize: 13, color: "var(--color-neutral-700)", marginTop: 5 }}>{booking.meta}</div>
        <div style={{ display: "flex", justifyContent: "center", marginTop: 18 }}>
          <QrGraphic size={180} />
        </div>
        <div style={{ fontSize: 12.5, color: "var(--color-neutral-700)", marginTop: 14 }}>Booking {booking.ref} · scanned at the door</div>
        <button className="btn btn-ghost btn-block" style={{ marginTop: 18, padding: "13px 0" }} onClick={closeSheet}>Done</button>
      </div>
    </Sheet>
  );
}
