import type { Metadata } from "next";
import { getPost } from "@/lib/api/posts";
import { Container } from "@/components/site/Container";
import { Prose } from "@/components/article/Prose";
import { SocialIcons } from "@/components/site/SocialIcons";
import { SITE } from "@/lib/config/site";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "About",
  description: `About ${SITE.name} — ${SITE.tagline}.`,
  alternates: { canonical: `${SITE.url}/about` },
};

export default async function AboutPage() {
  const post = await getPost("about");
  const title = post?.title || "A journal of life's spectrum.";

  return (
    <Container className="py-16 sm:py-24">
      <div className="mx-auto max-w-3xl">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          About
        </p>
        <h1 className="mt-4 font-display text-[length:var(--text-display)] leading-[1.05] text-foreground">
          {title}
        </h1>

        <div className="mt-10">
          {post?.content ? (
            <Prose html={post.content} />
          ) : (
            <div className="space-y-6 text-lg leading-relaxed text-foreground/85">
              <p>
                {SITE.name} is a personal editorial blog — a slow, deliberate space for reflection,
                inspiration, and discovery. {SITE.description}
              </p>
              <p>
                Here you&apos;ll find long-form essays and short field notes across life, culture, the
                mind, travel, and craft. Every piece is written to be read unhurried, in the way you
                might linger over a good magazine on a quiet morning.
              </p>
              <p>
                There is no algorithm here, no infinite feed — just writing, arranged with care. If a
                story stays with you, that&apos;s the whole point.
              </p>
            </div>
          )}
        </div>

        <div className="mt-12 flex flex-col gap-6 rounded-3xl bg-surface-raised p-8 ring-1 ring-border sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-2xl text-foreground">Stay in the loop</p>
            <p className="mt-1 text-sm text-muted-foreground">
              New essays, occasionally. No noise.
            </p>
          </div>
          <div className="flex items-center gap-5">
            <SocialIcons />
          </div>
        </div>
      </div>
    </Container>
  );
}
