import { useEffect, useState } from 'react';
import { MotifStack } from '../components/MotifStack';
import { loadPublishedUpdates } from '../lib/updatesApi';
import { resolveImageUrl } from '../lib/imageUrl';
import type { Update } from '../types/update';

function UpdateCard({ update }: { update: Update }) {
  const imgSrc = update.imageUrl ? resolveImageUrl(update.imageUrl) : '';
  return (
    <a className="update-card" href={`/updates/${update.slug}`} aria-label={update.title}>
      {imgSrc && (
        <div className="update-card__img">
          <img src={imgSrc} alt={update.title} loading="lazy" />
        </div>
      )}
      <div className="update-card__body">
        {update.label && <span className="update-card__label">{update.label}</span>}
        <span className="update-card__title">{update.title}</span>
        {update.subtitle && <span className="update-card__sub">{update.subtitle}</span>}
      </div>
    </a>
  );
}

export function UpdatesPage() {
  const [updates, setUpdates] = useState<Update[] | null>(null);

  useEffect(() => {
    document.title = 'Updates · Open Walls';
    loadPublishedUpdates().then(setUpdates);
  }, []);

  return (
    <>
      <header className="apply-nav">
        <a className="apply-nav__brand" href="/" aria-label="Open Walls home">
          <span className="apply-nav__mark">
            <MotifStack size={28} seed={88} layers={4} jitter={6} baseRot={-8} />
          </span>
          <span>Open Walls</span>
        </a>
        <a className="apply-nav__back" href="/#updates">
          ← Home
        </a>
      </header>

      <main className="updates-page">
        <div className="wrap">
          <div className="sec-head">
            <h1 className="display reveal">Updates</h1>
          </div>

          {updates === null ? (
            <div className="site-loading">
              <MotifStack size={60} seed={88} layers={4} jitter={7} />
              <span>Loading</span>
            </div>
          ) : updates.length === 0 ? (
            <p className="updates-empty">No updates yet. Check back soon.</p>
          ) : (
            <div className="updates-grid">
              {updates.map((u) => (
                <UpdateCard key={u.id} update={u} />
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
