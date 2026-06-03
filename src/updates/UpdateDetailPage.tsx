import { useEffect, useState } from 'react';
import { MotifStack } from '../components/MotifStack';
import { loadUpdateBySlug } from '../lib/updatesApi';
import { resolveImageUrl } from '../lib/imageUrl';
import type { Update } from '../types/update';

function paragraphs(text: string) {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function UpdateDetailPage() {
  const slug = window.location.pathname.replace(/^\/updates\//, '').replace(/\/$/, '');
  const [update, setUpdate] = useState<Update | null | undefined>(undefined);

  useEffect(() => {
    loadUpdateBySlug(slug).then((u) => {
      setUpdate(u);
      if (u) document.title = `${u.title} · Open Walls`;
    });
  }, [slug]);

  const imgSrc = update?.imageUrl ? resolveImageUrl(update.imageUrl) : '';

  const nav = (
    <header className="apply-nav">
      <a className="apply-nav__brand" href="/" aria-label="Open Walls home">
        <span className="apply-nav__mark">
          <MotifStack size={28} seed={88} layers={4} jitter={6} baseRot={-8} />
        </span>
        <span>Open Walls</span>
      </a>
      <a className="apply-nav__back" href="/updates">
        ← Updates
      </a>
    </header>
  );

  if (update === undefined) {
    return (
      <>
        {nav}
        <div className="site-loading">
          <MotifStack size={60} seed={88} layers={4} jitter={7} />
          <span>Loading</span>
        </div>
      </>
    );
  }

  if (update === null) {
    return (
      <>
        {nav}
        <main className="archive-main">
          <div className="wrap archive-not-found">
            <MotifStack size={70} seed={33} layers={4} jitter={8} />
            <h1 className="display">Update not found</h1>
            <p>We couldn't find that update.</p>
            <a className="btn btn--ghost" href="/updates">
              ← Back to Updates
            </a>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      {nav}
      <main className="update-detail">
        <div className="wrap update-detail__inner">
          {update.label && <span className="tag">{update.label}</span>}
          <h1 className="update-detail__title display">{update.title}</h1>
          {update.subtitle && <p className="update-detail__sub">{update.subtitle}</p>}
          {update.date && <p className="update-detail__date">{update.date}</p>}

          {imgSrc && (
            <div className="update-detail__img">
              <img
                src={imgSrc}
                alt={update.title}
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.parentElement!.style.display = 'none';
                }}
              />
            </div>
          )}

          {update.body && (
            <div className="update-detail__body">
              {paragraphs(update.body).map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          )}

          {update.ctaUrl && update.ctaLabel && (
            <div className="update-detail__cta">
              <a
                className="btn btn--primary"
                href={update.ctaUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {update.ctaLabel}
              </a>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
