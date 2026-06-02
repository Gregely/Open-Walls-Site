import { useEffect } from 'react';
import type { CSSProperties } from 'react';
import { MotifStack } from './components/MotifStack';
import { aboutCopy, contact, mailto, pastShows, upcomingShow } from './data/content';

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

function useProgressiveMotion() {
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
  }, []);
}

function Nav() {
  return (
    <header className="nav">
      <a className="nav__brand" href="#top" aria-label="Open Walls home">
        <span className="mark">
          <MotifStack size={30} seed={88} layers={4} jitter={6} baseRot={-8} />
        </span>
        <span>Open Walls</span>
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
      <a className="nav__cta" href={mailto('Open Walls - artist application')}>
        Get a spot
      </a>
    </header>
  );
}

function Hero() {
  return (
    <section className="hero" id="upcoming" aria-labelledby="upcoming-title">
      <div className="hero__motifs" aria-hidden="true">
        <PlacedMotif x={78} y={12} size={190} seed={101} jitter={9} />
        <PlacedMotif x={86} y={58} size={130} seed={202} jitter={7} />
        <PlacedMotif x={4} y={70} size={150} seed={303} jitter={8} />
        <PlacedMotif x={64} y={80} size={92} seed={404} jitter={10} />
        <PlacedMotif x={30} y={4} size={70} seed={505} jitter={11} />
      </div>
      <div className="badge-free">
        <span>
          Free
          <br />
          Entry
        </span>
      </div>
      <div className="wrap hero__inner">
        <div className="hero__top">
          <span className="tag reveal">{upcomingShow.volume}</span>
          <span className="eyebrow reveal" data-d="1">
            {upcomingShow.eyebrow}
          </span>
        </div>
        <h1
          id="upcoming-title"
          className="hero__date display reveal"
          data-d="1"
          aria-label={`${upcomingShow.dateLineOne} ${upcomingShow.dateLineTwo}`}
        >
          <span className="ln c-red">{upcomingShow.dateLineOne}</span>
          <span className="ln c-purple">{upcomingShow.dateLineTwo}</span>
        </h1>
        <div className="hero__time display reveal" data-d="2">
          {upcomingShow.time}
        </div>
        <div className="hero__venue reveal" data-d="2">
          {upcomingShow.venue}
        </div>
        <p className="hero__desc reveal" data-d="3">
          {upcomingShow.description}
        </p>
        <div className="hero__cta reveal" data-d="3">
          <a className="btn btn--primary" href={mailto(`${upcomingShow.volume} - artist application`)}>
            Get your spot <span className="arrow">-&gt;</span>
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

function PastShows() {
  return (
    <section className="section section--tint" id="past" aria-labelledby="past-title">
      <div className="wrap">
        <div className="sec-head">
          <h2 id="past-title" className="display reveal">
            Past Shows
          </h2>
          <p className="blurb reveal" data-d="1">
            Eleven rooms filled so far. Different walls every month, same idea - get the work out where people are.
          </p>
        </div>
        <div className="grid">
          {pastShows.map((show, index) => {
            const subject = `Open Walls ${show.volume} - ${show.date} at ${show.location}`;
            return (
              <a
                key={`${show.volume}-${show.date}`}
                className="card reveal"
                data-d={String((index % 3) + 1)}
                href={mailto(subject)}
                aria-label={`Ask about ${show.volume}, ${show.date}, ${show.location}`}
                style={{ '--card-accent': show.accent } as CSSProperties}
              >
                <span className="card__vol">{show.volume}</span>
                <span className="card__thumb" aria-hidden="true">
                  <MotifStack size={118} seed={show.seed} layers={5} jitter={8} />
                </span>
                <span className="card__date">{show.date}</span>
                <span className="card__loc">{show.location}</span>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function About() {
  return (
    <section className="section" id="about" aria-labelledby="about-title">
      <div className="wrap about__grid">
        <div>
          <h2 id="about-title" className="about__lead display reveal">
            A wall is just a gallery that hasn't been asked yet.
          </h2>
          <div className="about__body reveal" data-d="1">
            {aboutCopy.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <div className="contact reveal" data-d="2">
            <a href={mailto()}>
              <span className="ico">@</span>
              {contact.email}
            </a>
            <a href={contact.instagramUrl} target="_blank" rel="noopener noreferrer">
              <span className="ico">#</span>
              {contact.instagramHandle}
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

function Footer() {
  return (
    <footer className="footer">
      <div className="footer__motifs" aria-hidden="true">
        <PlacedMotif x={-3} y={10} size={120} seed={61} jitter={9} />
        <PlacedMotif x={88} y={30} size={150} seed={72} jitter={8} />
        <PlacedMotif x={40} y={62} size={80} seed={83} jitter={10} />
        <PlacedMotif x={70} y={4} size={60} seed={94} jitter={11} />
      </div>
      <div className="wrap">
        <div className="footer__mark display">Open Walls</div>
        <nav className="footer__row" aria-label="Footer">
          <a href="#upcoming">Upcoming</a>
          <a href="#past">Past Shows</a>
          <a href="#about">About</a>
          <a href={mailto()}>{contact.email}</a>
          <a href={contact.instagramUrl} target="_blank" rel="noopener noreferrer">
            {contact.instagramHandle}
          </a>
        </nav>
        <div className="footer__fine">Cork, Ireland · Monthly · Free entry · Bring a friend.</div>
      </div>
    </footer>
  );
}

export function App() {
  useProgressiveMotion();

  return (
    <>
      <Nav />
      <main id="top">
        <Hero />
        <MotifDivider />
        <PastShows />
        <About />
      </main>
      <Footer />
    </>
  );
}
