import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { MotifStack } from './components/MotifStack';
import { AdminPage } from './admin/AdminPage';
import { ApplyPage } from './apply/ApplyPage';
import { instagramHandle, mailto } from './data/content';
import { loadContent } from './lib/contentApi';
import { resolveImageUrl } from './lib/imageUrl';
import type { SiteContent } from './types/content';

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
    const sections = ['upcoming', 'past', 'about']
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];
    const navLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('.nav__links a[data-link]'));

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

      let current = '';
      const line = vh * 0.4;
      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= line && rect.bottom > line) current = section.id;
      });

      navLinks.forEach((link) => {
        link.classList.toggle('active', link.dataset.link === current);
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

function Nav({ content }: { content: SiteContent }) {
  const { settings } = content;

  return (
    <header className="nav">
      <a className="nav__brand" href="#top" aria-label={`${settings.siteName} home`}>
        <span className="mark">
          <MotifStack size={30} seed={88} layers={4} jitter={6} baseRot={-8} />
        </span>
        <span>{settings.siteName}</span>
      </a>
      <nav className="nav__links" aria-label="Sections">
        <a href="#upcoming" data-link="upcoming">
          Upcoming
        </a>
        <a href="#past" data-link="past">
          Past Shows
        </a>
        <a href="#about" data-link="about">
          About
        </a>
      </nav>
      <div className="nav__contact">
        <a href={mailto(settings.contactEmail)}>Email</a>
        <a href={settings.instagramUrl} target="_blank" rel="noreferrer">
          Instagram
        </a>
      </div>
    </header>
  );
}

function Hero({ content }: { content: SiteContent }) {
  const { settings, upcomingShow } = content;
  const [titleOne, titleTwo] = splitHeroTitle(settings.heroTitle || upcomingShow.date);
  const venueLine = [upcomingShow.venue, upcomingShow.location].filter(Boolean).join(' · ');

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
          <span className="eyebrow reveal" data-d="1">
            {settings.tagline}
          </span>
        </div>
        <h1 id="upcoming-title" className="hero__date display reveal" data-d="1" aria-label={settings.heroTitle}>
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
          {settings.heroBody || upcomingShow.description}
        </p>
        <div className="hero__cta reveal" data-d="3">
          <a className="btn btn--primary" href="/apply">
            {upcomingShow.ctaLabel} <span className="arrow">-&gt;</span>
          </a>
          <a className="btn btn--ghost" href="#about">
            Find out more
          </a>
        </div>
        <div className="lineup reveal" data-d="4">
          <div className="lineup__label">Showing this month</div>
          <div className="lineup__names hand" aria-label={`Showing this month: ${upcomingShow.artists.join(', ')}`}>
            {upcomingShow.artists.map((artist) => (
              <span key={artist}>{artist}</span>
            ))}
          </div>
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

function PastShows({ content }: { content: SiteContent }) {
  const { settings, pastShows } = content;

  return (
    <section className="section section--tint" id="past" aria-labelledby="past-title">
      <div className="wrap">
        <div className="sec-head">
          <h2 id="past-title" className="display reveal">
            Past Shows
          </h2>
          <p className="blurb reveal" data-d="1">
            Different walls every month, same idea - get the work out where people are.
          </p>
        </div>
        <div className="grid">
          {pastShows.map((show, index) => {
            const place = [show.venue, show.location].filter(Boolean).join(' · ');
            const subject = `Open Walls ${show.volume} - ${show.date} at ${place}`;
            const posterSrc = show.posterImageUrl ? resolveImageUrl(show.posterImageUrl) : '';
            return (
              <a
                key={show.id}
                className="card reveal"
                data-d={String((index % 3) + 1)}
                href={mailto(settings.contactEmail, subject)}
                aria-label={`Ask about ${show.volume}, ${show.date}, ${place}`}
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
    <section className="section" id="about" aria-labelledby="about-title">
      <div className="wrap about__grid">
        <div>
          <h2 id="about-title" className="about__lead display reveal">
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
          <a href="#about">About</a>
          <a href={mailto(settings.contactEmail)}>{settings.contactEmail}</a>
          <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer">
            {instagramHandle(settings.instagramUrl)}
          </a>
        </nav>
        <div className="footer__fine">{settings.footerText}</div>
      </div>
    </footer>
  );
}

function PublicSite() {
  const [loadResult, setLoadResult] = useState<Awaited<ReturnType<typeof loadContent>> | null>(null);

  useEffect(() => {
    let alive = true;
    loadContent(false).then((result) => {
      if (alive) setLoadResult(result);
    });
    return () => {
      alive = false;
    };
  }, []);

  const content = loadResult?.content;

  useEffect(() => {
    if (content?.settings.siteName) {
      document.title = `${content.settings.siteName} Cork`;
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

  return <RenderedSite content={content} fallbackWarning={import.meta.env.DEV && loadResult.source === 'fallback' ? loadResult.error : undefined} />;
}

function RenderedSite({ content, fallbackWarning }: { content: SiteContent; fallbackWarning?: string }) {
  useProgressiveMotion(content);

  return (
    <>
      <Nav content={content} />
      {fallbackWarning && <div className="content-warning">Showing fallback content. {fallbackWarning}</div>}
      <main id="top">
        <Hero content={content} />
        <MotifDivider />
        <PastShows content={content} />
        <About content={content} />
      </main>
      <Footer content={content} />
    </>
  );
}

export function App() {
  if (window.location.pathname.startsWith('/admin')) {
    return <AdminPage />;
  }

  if (window.location.pathname.startsWith('/apply')) {
    return <ApplyPage />;
  }

  return <PublicSite />;
}
