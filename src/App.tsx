import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { MotifStack } from './components/MotifStack';
import { AdminPage } from './admin/AdminPage';
import { ApplyPage } from './apply/ApplyPage';
import { PastShowArchivePage } from './past/PastShowArchivePage';
import { UpdatesPage } from './updates/UpdatesPage';
import { UpdateDetailPage } from './updates/UpdateDetailPage';
import { instagramHandle, mailto } from './data/content';
import { loadContent } from './lib/contentApi';
import { loadPublishedUpdates } from './lib/updatesApi';
import { resolveImageUrl } from './lib/imageUrl';
import type { SiteContent } from './types/content';
import type { Update } from './types/update';

function PlacedMotif({
  x,
  y,
  size,
  seed,
  jitter,
  layers,
}: {
  x: number;
  y: number;
  size: number;
  seed: number;
  jitter: number;
  layers?: number;
}) {
  const duration = 7 + ((seed * 17) % 60) / 10;
  const delay = -((seed * 13) % 60) / 10;

  return (
    <MotifStack
      size={size}
      seed={seed}
      jitter={jitter}
      layers={layers}
      style={
        {
          left: `${x}%`,
          top: `${y}%`,
          '--dur': `${duration.toFixed(1)}s`,
          '--delay': `${delay.toFixed(1)}s`,
        } as CSSProperties
      }
    />
  );
}

function useProgressiveMotion(content: SiteContent) {
  useEffect(() => {
    const root = document.documentElement;
    const revealEls = Array.from(document.querySelectorAll<HTMLElement>('.reveal'));

    root.classList.add('anim');

    let pending = false;
    const onScroll = () => {
      const vh = window.innerHeight || document.documentElement.clientHeight;
      revealEls.forEach((el) => {
        if (el.classList.contains('in')) return;
        if (el.getBoundingClientRect().top < vh * 0.92) {
          el.classList.add('in');
        }
      });
    };

    const requestScroll = () => {
      if (pending) return;
      pending = true;
      window.requestAnimationFrame(() => {
        onScroll();
        pending = false;
      });
    };

    const revealAll = () => {
      revealEls.forEach((el) => el.classList.add('in'));
    };

    window.addEventListener('scroll', requestScroll, { passive: true });
    window.addEventListener('resize', requestScroll);
    onScroll();
    const safety = window.setTimeout(revealAll, 1600);

    return () => {
      window.removeEventListener('scroll', requestScroll);
      window.removeEventListener('resize', requestScroll);
      window.clearTimeout(safety);
      root.classList.remove('anim');
    };
  }, [content]);
}

function splitHeroTitle(title: string) {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return [title, ''];
  return [words.slice(0, -1).join(' '), words[words.length - 1]];
}

function paragraphs(text: string) {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function SiteHeader({ content }: { content: SiteContent }) {
  const { settings } = content;

  return (
    <header className="site-header">
      <a className="site-header__brand" href="#top" aria-label={`${settings.siteName} home`}>
        <span className="site-header__mark">
          <MotifStack size={26} seed={88} layers={4} jitter={6} baseRot={-8} />
        </span>
        <span>{settings.siteName}</span>
      </a>
      <div className="site-header__links">
        <a href={mailto(settings.contactEmail)}>Email</a>
        <a href={settings.instagramUrl} target="_blank" rel="noreferrer">
          Instagram
        </a>
        {settings.donateUrl && (
          <a href={settings.donateUrl} target="_blank" rel="noreferrer">
            Donate
          </a>
        )}
      </div>
    </header>
  );
}

function Masthead({ content }: { content: SiteContent }) {
  const { settings } = content;

  return (
    <div className="masthead">
      <div className="masthead__motifs" aria-hidden="true">
        <PlacedMotif x={82} y={-6}  size={175} seed={14} jitter={8} />
        <PlacedMotif x={-3} y={34}  size={105} seed={37} jitter={9} />
        <PlacedMotif x={73} y={66}  size={135} seed={66} jitter={8} />
        <PlacedMotif x={12} y={58}  size={72}  seed={22} jitter={10} />
      </div>
      <div className="wrap masthead__inner">
        <h1 className="masthead__title display">{settings.siteName}</h1>
        {settings.tagline && <p className="masthead__tagline">{settings.tagline}</p>}
        <nav className="masthead__nav" aria-label="Sections">
          <a className="masthead__nav-btn masthead__nav-btn--upcoming" href="#upcoming">
            Upcoming Show
          </a>
          <a className="masthead__nav-btn" href="#updates">
            Updates
          </a>
          <a className="masthead__nav-btn" href="#past">
            Past Shows
          </a>
          <a className="masthead__nav-btn" href="#about">
            Who We Are
          </a>
        </nav>
      </div>
    </div>
  );
}

function Hero({ content }: { content: SiteContent }) {
  const { upcomingShow } = content;
  const [titleOne, titleTwo] = splitHeroTitle(upcomingShow.date);
  const venueLine = [upcomingShow.venue, upcomingShow.location].filter(Boolean).join(' · ');
  const fomUrl = upcomingShow.findOutMoreUrl || '/#about';
  const fomLabel = upcomingShow.findOutMoreLabel || 'Find out more';
  const fomExternal = /^https?:\/\//i.test(fomUrl);

  return (
    <section className="hero" id="upcoming" aria-labelledby="upcoming-title">
      <div className="hero__motifs" aria-hidden="true">
        <PlacedMotif x={78} y={12} size={190} seed={101} jitter={9} />
        <PlacedMotif x={86} y={58} size={130} seed={202} jitter={7} />
        <PlacedMotif x={4} y={70} size={150} seed={303} jitter={8} />
        <PlacedMotif x={64} y={80} size={92} seed={404} jitter={10} />
        <PlacedMotif x={30} y={4} size={70} seed={505} jitter={11} />
      </div>
      {upcomingShow.freeEntry && (
        <div className="badge-free">
          <span>
            Free
            <br />
            Entry
          </span>
        </div>
      )}
      <div className="wrap hero__inner">
        <div className="hero__top">
          <span className="tag reveal">{upcomingShow.volume}</span>
        </div>
        <h1 id="upcoming-title" className="hero__date display reveal" data-d="1" aria-label={upcomingShow.date}>
          <span className="ln c-red">{titleOne}</span>
          {titleTwo && <span className="ln c-purple">{titleTwo}</span>}
        </h1>
        <div className="hero__time display reveal" data-d="2">
          {upcomingShow.time}
        </div>
        <div className="hero__venue reveal" data-d="2">
          {venueLine}
        </div>
        <p className="hero__desc reveal" data-d="3">
          {upcomingShow.description}
        </p>
        <div className="hero__cta reveal" data-d="3">
          {upcomingShow.applicationsOpen ? (
            <a className="btn btn--primary" href="/apply">
              {upcomingShow.ctaLabel}
            </a>
          ) : (
            // Applications closed: render a real <button disabled> so the
            // browser handles non-clickability natively. Do not use <a disabled>
            // (invalid HTML) or keep the href (would still be followable).
            <button
              type="button"
              className="btn btn--primary"
              disabled
              aria-disabled="true"
            >
              {upcomingShow.ctaLabel}
            </button>
          )}
          <a
            className="btn btn--ghost"
            href={fomUrl}
            {...(fomExternal ? { target: '_blank', rel: 'noreferrer' } : {})}
          >
            {fomLabel}
          </a>
        </div>
      </div>
    </section>
  );
}

function MotifDivider() {
  const seeds = [11, 27, 5, 44, 19, 8, 31];

  return (
    <div className="divider" aria-hidden="true">
      {seeds.map((seed, index) => (
        <MotifStack key={seed} size={46 + (index % 3) * 14} seed={seed} layers={4} jitter={9} />
      ))}
    </div>
  );
}

const UPDATES_PREVIEW = 3;

function UpdatesSection({ updates }: { updates: Update[] }) {
  if (updates.length === 0) return null;

  return (
    <section className="section updates-section" id="updates" aria-labelledby="updates-title">
      <div className="wrap">
        <div className="updates-section__head">
          <h2 id="updates-title" className="display reveal">
            Updates
          </h2>
        </div>
        <div className="updates-grid">
          {updates.slice(0, UPDATES_PREVIEW).map((u) => {
            const imgSrc = u.imageUrl ? resolveImageUrl(u.imageUrl) : '';
            return (
              <a
                key={u.id}
                className="update-card reveal"
                href={`/updates/${u.slug}`}
                aria-label={u.title}
              >
                {imgSrc && (
                  <div className="update-card__img">
                    <img src={imgSrc} alt={u.title} loading="lazy" />
                  </div>
                )}
                <div className="update-card__body">
                  {u.label && <span className="update-card__label">{u.label}</span>}
                  <span className="update-card__title">{u.title}</span>
                  {u.subtitle && <span className="update-card__sub">{u.subtitle}</span>}
                  {u.date && <span className="update-card__date">{u.date}</span>}
                </div>
              </a>
            );
          })}
        </div>
        <div className="updates-section__foot">
          <a className="updates-more" href="/updates">
            View all updates →
          </a>
        </div>
      </div>
    </section>
  );
}

const PAST_SHOWS_PREVIEW = 3;

function PastShows({ content }: { content: SiteContent }) {
  const { settings, pastShows } = content;
  const [showAll, setShowAll] = useState(false);

  const hasMore = pastShows.length > PAST_SHOWS_PREVIEW;
  const hiddenCount = pastShows.length - PAST_SHOWS_PREVIEW;
  const displayedShows = showAll ? pastShows : pastShows.slice(0, PAST_SHOWS_PREVIEW);

  return (
    <section className="section section--tint" id="past" aria-labelledby="past-title">
      <div className="wrap">
        <div className="sec-head">
          <h2 id="past-title" className="display reveal">
            Past Shows
          </h2>

        </div>

        {/* Toggle control — sits above the grid so it is always reachable,
            even after expanding a long list on mobile. */}
        {hasMore && (
          <div className="past-shows__controls">
            <span className="past-shows__count">
              {showAll
                ? `All ${pastShows.length} past shows`
                : `Showing 3 of ${pastShows.length}`}
            </span>
            <button
              type="button"
              className="past-shows__toggle"
              aria-expanded={showAll}
              aria-controls="past-shows-grid"
              onClick={() => setShowAll((prev) => !prev)}
            >
              {showAll ? 'Show fewer' : `Show ${hiddenCount} more`}
            </button>
          </div>
        )}

        <div className="grid" id="past-shows-grid">
          {displayedShows.map((show, index) => {
            const place = [show.venue, show.location].filter(Boolean).join(' · ');
            const posterSrc = show.posterImageUrl ? resolveImageUrl(show.posterImageUrl) : '';
            // Cards beyond the initial preview are revealed immediately when
            // expanded — the scroll-based reveal effect (useProgressiveMotion)
            // only re-runs when `content` changes, not on local state toggles,
            // so newly-shown cards need the `in` class baked in from the start.
            const isExtra = showAll && index >= PAST_SHOWS_PREVIEW;
            return (
              <a
                key={show.id}
                className={`card reveal${isExtra ? ' in' : ''}`}
                data-d={String((index % 3) + 1)}
                href={`/past/${show.id}`}
                aria-label={`View ${show.volume} archive${place ? `, ${place}` : ''}`}
                style={{ '--card-accent': show.accent } as CSSProperties}
              >
                <span className="card__vol">{show.volume}</span>
                {posterSrc ? (
                  <span className="card__thumb">
                    <img
                      src={posterSrc}
                      alt={`${show.volume} poster — ${show.date}${place ? ` at ${place}` : ''}`}
                      className="card__poster"
                      loading="lazy"
                    />
                  </span>
                ) : (
                  <span className="card__thumb" aria-hidden="true">
                    <MotifStack size={118} seed={show.seed} layers={5} jitter={8} />
                  </span>
                )}
                <span className="card__date">{show.date}</span>
                <span className="card__loc">{place}</span>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function About({ content }: { content: SiteContent }) {
  const { settings } = content;

  return (
    <section className="section" id="about" aria-label="Who We Are">
      <div className="wrap about__grid">
        <div>
          <span className="tag reveal" style={{ marginBottom: 'clamp(16px, 2.5vh, 24px)', display: 'inline-block' }}>Who We Are</span>
          <h2 id="about-title" className="about__lead display reveal" data-d="1">
            {settings.aboutTitle}
          </h2>
          <div className="about__body reveal" data-d="1">
            {paragraphs(settings.aboutBody).map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <div className="contact reveal" data-d="2">
            <a href={mailto(settings.contactEmail)}>
              <span className="ico">@</span>
              {settings.contactEmail}
            </a>
            <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer">
              <span className="ico">#</span>
              {instagramHandle(settings.instagramUrl)}
            </a>
          </div>
        </div>
        <div className="about__stack reveal" data-d="2" aria-hidden="true">
          <MotifStack size={260} seed={777} layers={6} jitter={7} baseRot={6} />
        </div>
      </div>
    </section>
  );
}

function Footer({ content }: { content: SiteContent }) {
  const { settings } = content;

  return (
    <footer className="footer">
      <div className="footer__motifs" aria-hidden="true">
        <PlacedMotif x={-3} y={10} size={120} seed={61} jitter={9} />
        <PlacedMotif x={88} y={30} size={150} seed={72} jitter={8} />
        <PlacedMotif x={40} y={62} size={80} seed={83} jitter={10} />
        <PlacedMotif x={70} y={4} size={60} seed={94} jitter={11} />
      </div>
      <div className="wrap">
        <div className="footer__mark display">{settings.siteName}</div>
        <nav className="footer__row" aria-label="Footer">
          <a href="#upcoming">Upcoming</a>
          <a href="#past">Past Shows</a>
          <a href="#about">Who We Are</a>
          <a href={mailto(settings.contactEmail)}>{settings.contactEmail}</a>
          <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer">
            {instagramHandle(settings.instagramUrl)}
          </a>
          {settings.donateUrl && (
            <a href={settings.donateUrl} target="_blank" rel="noopener noreferrer">
              Donate
            </a>
          )}
        </nav>
        <div className="footer__fine">{settings.footerText}</div>
      </div>
    </footer>
  );
}

function PublicSite() {
  const [loadResult, setLoadResult] = useState<Awaited<ReturnType<typeof loadContent>> | null>(null);
  const [updates, setUpdates] = useState<Update[]>([]);

  useEffect(() => {
    let alive = true;
    // Load site content and published updates together so the page only renders
    // once both are available. This eliminates the race where content arrives
    // first (updates = []), UpdatesSection returns null, and the reveal/scroll
    // hooks fire before the updates section ever mounts.
    Promise.all([
      loadContent(false),
      loadPublishedUpdates().catch((err) => {
        console.error('Failed to load updates:', err);
        return [] as Update[];
      }),
    ]).then(([contentResult, updatesList]) => {
      if (!alive) return;
      setLoadResult(contentResult);
      setUpdates(updatesList);
    });
    return () => {
      alive = false;
    };
  }, []);

  const content = loadResult?.content;

  useEffect(() => {
    if (content?.settings.siteName) {
      document.title = `${content.settings.siteName}`;
    }
  }, [content]);

  if (!content) {
    return (
      <div className="site-loading">
        <MotifStack size={84} seed={88} layers={4} jitter={7} />
        <span>Loading Open Walls</span>
      </div>
    );
  }

  return (
    <RenderedSite
      content={content}
      updates={updates}
      fallbackWarning={import.meta.env.DEV && loadResult.source === 'fallback' ? loadResult.error : undefined}
    />
  );
}

function RenderedSite({
  content,
  updates,
  fallbackWarning,
}: {
  content: SiteContent;
  updates: Update[];
  fallbackWarning?: string;
}) {
  useProgressiveMotion(content);

  return (
    <>
      <SiteHeader content={content} />
      <Masthead content={content} />
      {fallbackWarning && <div className="content-warning">Showing fallback content. {fallbackWarning}</div>}
      <main id="top">
        <Hero content={content} />
        <MotifDivider />
        <UpdatesSection updates={updates} />
        <PastShows content={content} />
        <About content={content} />
      </main>
      <Footer content={content} />
    </>
  );
}

export function App() {
  if (window.location.pathname.startsWith('/admin')) {
    return (
      <>
        <AdminPage />
        <Analytics />
      </>
    );
  }

  if (window.location.pathname.startsWith('/apply')) {
    return (
      <>
        <ApplyPage />
        <Analytics />
      </>
    );
  }

  if (window.location.pathname.startsWith('/past/')) {
    return (
      <>
        <PastShowArchivePage />
        <Analytics />
      </>
    );
  }

  if (window.location.pathname === '/updates') {
    return (
      <>
        <UpdatesPage />
        <Analytics />
      </>
    );
  }

  if (window.location.pathname.startsWith('/updates/')) {
    return (
      <>
        <UpdateDetailPage />
        <Analytics />
      </>
    );
  }

  return (
    <>
      <PublicSite />
      <Analytics />
    </>
  );
}
