import { ImageResponse } from "next/og";
import { getPost } from "@/lib/api/posts";
import { SITE } from "@/lib/config/site";

export const runtime = "nodejs";
export const alt = `${SITE.name} article`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// AshGray palette (sRGB approximations of the oklch tokens for next/og).
const PAPER = "#f6f4ee";
const INK = "#2b2723";
const MUTED = "#8a827a";
const ACCENT = "#e6d8c3";

interface OgProps {
  params: Promise<{ slug: string }>;
}

export default async function OgImage({ params }: OgProps) {
  const { slug } = await params;
  const post = await getPost(slug);

  const title = post?.title ?? SITE.name;
  const category = post?.category?.name ?? "Journal";
  const reading = post?.readingTimeMin ? `${post.readingTimeMin} min read` : "";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: PAPER,
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              fontSize: 26,
              fontWeight: 600,
              color: INK,
              letterSpacing: -0.5,
            }}
          >
            {SITE.name}
          </div>
          <div
            style={{
              display: "flex",
              padding: "10px 22px",
              borderRadius: 999,
              background: ACCENT,
              color: INK,
              fontSize: 22,
              textTransform: "uppercase",
              letterSpacing: 2,
            }}
          >
            {category}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: title.length > 60 ? 68 : 84,
            lineHeight: 1.05,
            fontWeight: 600,
            color: INK,
            letterSpacing: -1.5,
            maxWidth: 1040,
          }}
        >
          {title}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 26,
            color: MUTED,
          }}
        >
          <span>{SITE.tagline}</span>
          <span>{reading}</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
