import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

interface RevalidateBody {
  tags?: unknown;
}

/** Constant-time secret comparison (avoids a timing side-channel). */
function secretMatches(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * On-demand revalidation webhook. The backend calls this after publish/edit
 * with a shared secret header and a list of cache tags to invalidate.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.REVALIDATE_SECRET;
  const provided = request.headers.get("x-revalidate-secret");

  // Fail closed if the server isn't configured or the secret doesn't match.
  if (!secret || !secretMatches(provided, secret)) {
    return NextResponse.json({ revalidated: false, error: "unauthorized" }, { status: 401 });
  }

  let body: RevalidateBody;
  try {
    body = (await request.json()) as RevalidateBody;
  } catch {
    return NextResponse.json({ revalidated: false, error: "invalid json" }, { status: 400 });
  }

  const tags = Array.isArray(body.tags)
    ? body.tags.filter((t): t is string => typeof t === "string" && t.length > 0)
    : [];

  if (tags.length === 0) {
    return NextResponse.json({ revalidated: false, error: "no tags provided" }, { status: 400 });
  }

  // Webhook-triggered: expire immediately so publishes surface right away.
  for (const tag of tags) {
    revalidateTag(tag, { expire: 0 });
  }

  return NextResponse.json({ revalidated: true, tags, now: Date.now() });
}
