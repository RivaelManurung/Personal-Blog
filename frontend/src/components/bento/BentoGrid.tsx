import type { PostSummary } from "@/types/api";
import { ArticleCard } from "@/components/article/ArticleCard";
import { HeroFeatureCard } from "./HeroFeatureCard";
import { IntroPanel } from "./IntroPanel";

interface BentoGridProps {
  /** Ordered featured posts: [hero, left 001, left 002, right 003, ...]. */
  posts: PostSummary[];
}

/**
 * AshGray bento home layout (12-col):
 * - left ~3/12: two stacked photo cards (indices 001, 002)
 * - center ~6/12: large hero card with white-plate headline
 * - right ~3/12: intro panel on top, one more card below (index 003)
 * On mobile everything stacks with the hero first.
 */
export function BentoGrid({ posts }: BentoGridProps) {
  const [hero, leftA, leftB, rightFeature] = posts;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-stretch">
      {/* Center hero — first in DOM so it stacks first on mobile */}
      {hero && (
        <div className="lg:col-span-6 lg:col-start-4 lg:row-start-1">
          <HeroFeatureCard post={hero} className="h-full" />
        </div>
      )}

      {/* Left stacked column */}
      {(leftA || leftB) && (
        <div className="flex flex-col gap-5 lg:col-span-3 lg:col-start-1 lg:row-start-1">
          {leftA && <ArticleCard post={leftA} index={1} variant="stacked" />}
          {leftB && <ArticleCard post={leftB} index={2} variant="stacked" />}
        </div>
      )}

      {/* Right column: intro on top, feature card below */}
      <div className="flex flex-col gap-5 lg:col-span-3 lg:col-start-10 lg:row-start-1">
        <IntroPanel />
        {rightFeature && (
          <ArticleCard
            post={rightFeature}
            index={3}
            variant="feature"
            className="lg:min-h-0 lg:flex-1"
          />
        )}
      </div>
    </div>
  );
}
