import { ImageResponse } from "next/og";
import { SITE } from "@/lib/config/site";

export const runtime = "nodejs";
export const alt = `${SITE.name} — ${SITE.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PAPER = "#f6f4ee";
const INK = "#2b2723";
const MUTED = "#8a827a";
const ACCENT = "#e6d8c3";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: PAPER,
          padding: 80,
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 64,
            left: 80,
            display: "flex",
            padding: "10px 22px",
            borderRadius: 999,
            background: ACCENT,
            color: INK,
            fontSize: 22,
            textTransform: "uppercase",
            letterSpacing: 3,
          }}
        >
          Editorial Journal
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 128,
            fontWeight: 600,
            color: INK,
            letterSpacing: -3,
          }}
        >
          {SITE.name}
        </div>
        <div style={{ display: "flex", marginTop: 16, fontSize: 34, color: MUTED }}>
          {SITE.tagline}
        </div>
      </div>
    ),
    { ...size },
  );
}
