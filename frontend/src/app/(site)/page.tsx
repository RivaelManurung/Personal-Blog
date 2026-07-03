import Link from "next/link";
import { Suspense } from "react";
import { getFeaturedPosts } from "@/lib/api/posts";
import { Container } from "@/components/site/Container";
import { BentoGrid } from "@/components/bento/BentoGrid";
import { JoinNowButton } from "@/components/site/JoinNowButton";
import { BentoSkeleton } from "@/components/site/Skeletons";
import { SITE } from "@/lib/config/site";

export default async function HomePage() {
  return (
    <Container className="pb-12 pt-2 sm:pt-4">
      {/* The reference goes straight from header to bento; keep the h1 for a11y/SEO. */}
      <h1 id="home-heading" className="sr-only">
        {SITE.name} — {SITE.tagline}
      </h1>

      <section aria-labelledby="home-heading">
        <Suspense fallback={<BentoSkeleton />}>
          <FeaturedPosts />
        </Suspense>
      </section>
    </Container>
  );
}

async function FeaturedPosts() {
  const posts = await getFeaturedPosts(5);

  if (posts.length === 0) {
    return <EmptyHome />;
  }

  return <BentoGrid posts={posts} />;
}

function EmptyHome() {
  return (
    <div className="rounded-3xl bg-surface-sunken p-12 text-center ring-1 ring-border sm:p-20">
      <p className="font-display text-[length:var(--text-title)] text-foreground">
        Stories are on their way.
      </p>
      <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
        {SITE.description} New writing will appear here soon — check back shortly or explore the
        archive.
      </p>
      <div className="mt-8 flex items-center justify-center gap-3">
        <JoinNowButton label="Explore" href="/articles" />
        <Link
          href="/about"
          className="rounded-full px-6 py-3 text-xs font-medium uppercase tracking-[0.18em] text-foreground ring-1 ring-border transition hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          About
        </Link>
      </div>
    </div>
  );
}
