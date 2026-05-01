import { ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  /**
   * If true the container removes its own horizontal padding. Use this when
   * the page wants edge-to-edge content (e.g. a hero image that bleeds to
   * the screen edges). Default is false — the container provides the same
   * px-5 / sm:px-6 / lg:px-8 padding that AppLayout's <main> would.
   *
   * Note: AppLayout already supplies that padding on <main>, so you do NOT
   * normally need to nest a padded PageContainer inside it. Use this with
   * `bleed` when you want to escape the AppLayout padding on a single page
   * while still keeping iPhone-safe overflow rules.
   */
  bleed?: boolean;
}

/**
 * Mobile-safe page wrapper. Drop this around every page's content to get:
 *
 *   - guaranteed no horizontal overflow on iPhone (overflow-x-hidden + min-w-0)
 *   - long words and URLs that wrap instead of pushing the viewport
 *   - a sensible vertical rhythm and gap between sections
 *
 * Compose with semantic <section> blocks inside, e.g.
 *
 *   <PageContainer>
 *     <header>...</header>
 *     <section>...</section>
 *     <section>...</section>
 *   </PageContainer>
 */
export default function PageContainer({
  children,
  className = '',
  bleed = false,
}: PageContainerProps) {
  return (
    <div
      className={[
        'page-shell',
        'flex flex-col gap-5',
        bleed ? '-mx-5 sm:-mx-6 lg:-mx-8' : '',
        // overflow-x-clip is the modern replacement for overflow-x-hidden that
        // doesn't create a new scrolling context. Browsers without support
        // (older iOS) fall back to hidden via the body-level rule.
        'overflow-x-clip',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
}
