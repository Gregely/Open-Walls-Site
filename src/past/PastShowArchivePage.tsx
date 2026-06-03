import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { MotifStack } from '../components/MotifStack';
import { loadContent } from '../lib/contentApi';
import { resolveImageUrl } from '../lib/imageUrl';
import type { ArtistPromo, EventPhoto, PastShow, SiteSettings } from '../types/content';

// ── Nav ───────────────────────────────────────────────────────────────────

function ArchiveNav({ siteName }: { siteName: string }) {
  return (
    <header className="apply-nav">
      <a className="apply-nav__brand" href="/" aria-label={`${siteName} home`}>
        <span className="apply-nav__mark">
          <MotifStack size={28} seed={88} layers={4} jitter={6} baseRot={-8} />
        </span>
        <span>{siteName}</span>
      </a>
      <a className="apply-nav__back" href="/#past">
        ← Past Shows
      </a>
    </header>
  );
}

// ── Show header ───────────────────────────────────────────────────────────

function ArchiveHeader({ show }: { show: PastShow }) {
  const place = [show.venue, show.location].filter(Boolean).join(' · ');
  const posterSrc = show.posterImageUrl ? resolveImageUrl(show.posterImageUrl) : '';

  return (
    <div className="archive-header" style={{ '--show-accent': show.accent } as CSSProperties}>
      <div className="archive-header__meta">
        <span className="tag">{show.volume}</span>
        <h1 className="archive-header__date display">{show.date}</h1>
        {place && <p className="archive-header__place">{place}</p>}
        {show.notes && <p className="archive-header__notes">{show.notes}</p>}
      </div>
      {posterSrc && (
        <div className="archive-header__poster">
          <img
            src={posterSrc}
            alt={`${show.volume} poster — ${show.date}${place ? ` at ${place}` : ''}`}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.parentElement!.style.display = 'none';
            }}
          />
        </div>
      )}
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────

type ArchiveTab = 'promos' | 'photos';

function ArchiveTabs({
  active,
  onChange,
  promoCount,
  photoCount,
}: {
  active: ArchiveTab;
  onChange: (tab: ArchiveTab) => void;
  promoCount: number;
  photoCount: number;
}) {
  return (
    <div className="archive-tabs" role="tablist" aria-label="Archive sections">
      <button
        role="tab"
        type="button"
        className={`archive-tab${active === 'promos' ? ' archive-tab--active' : ''}`}
        aria-selected={active === 'promos'}
        aria-controls="archive-panel-promos"
        id="archive-tab-promos"
        onClick={() => onChange('promos')}
      >
        Artist Promos{promoCount > 0 ? ` (${promoCount})` : ''}
      </button>
      <button
        role="tab"
        type="button"
        className={`archive-tab${active === 'photos' ? ' archive-tab--active' : ''}`}
        aria-selected={active === 'photos'}
        aria-controls="archive-panel-photos"
        id="archive-tab-photos"
        onClick={() => onChange('photos')}
      >
        Event Photos{photoCount > 0 ? ` (${photoCount})` : ''}
      </button>
    </div>
  );
}

// ── Artist promo modal ────────────────────────────────────────────────────

function PromoModal({ promo, onClose }: { promo: ArtistPromo; onClose: () => void }) {
  const [imgIndex, setImgIndex] = useState(0);
  const overlayRef = useRef<HTMLDivElement>(null);
  const visibleImages = promo.images.filter((img) => img.url);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setImgIndex((i) => Math.min(i + 1, visibleImages.length - 1));
      if (e.key === 'ArrowLeft') setImgIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, visibleImages.length]);

  const currentImg = visibleImages[imgIndex];

  return (
    <div
      className="lightbox"
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${promo.artistName} artist promo`}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="lightbox__panel">
        <button type="button" className="lightbox__close" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <div className="lightbox__promo-head">
          <h2 className="lightbox__promo-name display">{promo.artistName}</h2>
          {promo.socialUrl && (
            <a
              className="lightbox__promo-social"
              href={promo.socialUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {promo.socialUrl.replace(/^https?:\/\/(www\.)?/, '')}
            </a>
          )}
          {promo.description && <p className="lightbox__promo-desc">{promo.description}</p>}
        </div>
        {visibleImages.length === 0 ? (
          <p className="lightbox__empty">No images added yet.</p>
        ) : (
          <>
            <div className="lightbox__img-wrap">
              <img
                src={resolveImageUrl(currentImg.url)}
                alt={currentImg.alt || `${promo.artistName} — image ${imgIndex + 1}`}
                loading="lazy"
              />
            </div>
            {currentImg.caption && <p className="lightbox__caption">{currentImg.caption}</p>}
            {visibleImages.length > 1 && (
              <div className="lightbox__nav">
                <button
                  type="button"
                  className="lightbox__nav-btn"
                  onClick={() => setImgIndex((i) => Math.max(i - 1, 0))}
                  disabled={imgIndex === 0}
                  aria-label="Previous image"
                >
                  ←
                </button>
                <span className="lightbox__counter">
                  {imgIndex + 1} / {visibleImages.length}
                </span>
                <button
                  type="button"
                  className="lightbox__nav-btn"
                  onClick={() => setImgIndex((i) => Math.min(i + 1, visibleImages.length - 1))}
                  disabled={imgIndex === visibleImages.length - 1}
                  aria-label="Next image"
                >
                  →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Event photo lightbox ──────────────────────────────────────────────────

function PhotoLightbox({
  photos,
  index,
  onClose,
  onNavigate,
}: {
  photos: EventPhoto[];
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const photo = photos[index];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && index < photos.length - 1) onNavigate(index + 1);
      if (e.key === 'ArrowLeft' && index > 0) onNavigate(index - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onNavigate, index, photos.length]);

  if (!photo) return null;

  return (
    <div
      className="lightbox"
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label="Event photo"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="lightbox__panel lightbox__panel--photo">
        <button type="button" className="lightbox__close" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <div className="lightbox__img-wrap">
          <img
            src={resolveImageUrl(photo.url)}
            alt={photo.alt || photo.caption || 'Event photo'}
            loading="lazy"
          />
        </div>
        {(photo.caption || photo.credit) && (
          <p className="lightbox__caption">
            {photo.caption}
            {photo.caption && photo.credit && ' · '}
            {photo.credit && <span className="lightbox__credit">Photo: {photo.credit}</span>}
          </p>
        )}
        {photos.length > 1 && (
          <div className="lightbox__nav">
            <button
              type="button"
              className="lightbox__nav-btn"
              onClick={() => onNavigate(index - 1)}
              disabled={index === 0}
              aria-label="Previous photo"
            >
              ←
            </button>
            <span className="lightbox__counter">
              {index + 1} / {photos.length}
            </span>
            <button
              type="button"
              className="lightbox__nav-btn"
              onClick={() => onNavigate(index + 1)}
              disabled={index === photos.length - 1}
              aria-label="Next photo"
            >
              →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Artist promo grid ─────────────────────────────────────────────────────

function PromoGrid({
  promos,
  onOpen,
}: {
  promos: ArtistPromo[];
  onOpen: (promo: ArtistPromo) => void;
}) {
  if (promos.length === 0) {
    return <p className="archive-empty">Artist promos coming soon.</p>;
  }

  return (
    <div className="archive-promo-grid">
      {promos.map((promo) => {
        const firstImg = promo.images.find((img) => img.url);
        const imgSrc = firstImg ? resolveImageUrl(firstImg.url) : '';
        return (
          <button
            key={promo.id}
            type="button"
            className="promo-card"
            onClick={() => onOpen(promo)}
            aria-label={`View ${promo.artistName} promo`}
          >
            <div className="promo-card__thumb">
              {imgSrc ? (
                <img src={imgSrc} alt={firstImg?.alt || promo.artistName} loading="lazy" />
              ) : (
                <div className="promo-card__placeholder" aria-hidden="true">
                  <MotifStack
                    size={80}
                    seed={(promo.artistName.charCodeAt(0) || 42) * 7}
                    layers={4}
                    jitter={7}
                  />
                </div>
              )}
            </div>
            <div className="promo-card__body">
              <span className="promo-card__name">{promo.artistName}</span>
              {promo.description && (
                <span className="promo-card__desc">{promo.description}</span>
              )}
              {promo.images.length > 1 && (
                <span className="promo-card__count">{promo.images.length} images</span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── Event photo grid ──────────────────────────────────────────────────────

function PhotoGrid({
  photos,
  onOpen,
}: {
  photos: EventPhoto[];
  onOpen: (index: number) => void;
}) {
  if (photos.length === 0) {
    return <p className="archive-empty">Event photos coming soon.</p>;
  }

  return (
    <div className="archive-photo-grid">
      {photos.map((photo, idx) => (
        <button
          key={photo.id}
          type="button"
          className="photo-thumb"
          onClick={() => onOpen(idx)}
          aria-label={photo.alt || photo.caption || `Event photo ${idx + 1}`}
        >
          <img
            src={resolveImageUrl(photo.url)}
            alt={photo.alt || photo.caption || `Event photo ${idx + 1}`}
            loading="lazy"
          />
        </button>
      ))}
    </div>
  );
}

// ── Archive page content ──────────────────────────────────────────────────

function ArchiveContent({
  show,
  settings,
}: {
  show: PastShow;
  settings: SiteSettings;
}) {
  const [activeTab, setActiveTab] = useState<ArchiveTab>('promos');
  const [openPromo, setOpenPromo] = useState<ArtistPromo | null>(null);
  const [openPhotoIdx, setOpenPhotoIdx] = useState<number | null>(null);

  const visiblePromos = show.artistPromos
    .filter((p) => p.visible)
    .sort((a, b) => a.displayOrder - b.displayOrder);

  const visiblePhotos = show.eventPhotos
    .filter((p) => p.visible && p.url)
    .sort((a, b) => a.displayOrder - b.displayOrder);

  useEffect(() => {
    document.title = `${show.volume} · ${settings.siteName}`;
    return () => {
      document.title = settings.siteName;
    };
  }, [show.volume, settings.siteName]);

  useEffect(() => {
    const isOpen = openPromo !== null || openPhotoIdx !== null;
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [openPromo, openPhotoIdx]);

  return (
    <>
      <ArchiveNav siteName={settings.siteName} />
      <main className="archive-main">
        <div className="wrap">
          <ArchiveHeader show={show} />
          <ArchiveTabs
            active={activeTab}
            onChange={setActiveTab}
            promoCount={visiblePromos.length}
            photoCount={visiblePhotos.length}
          />
          <div
            id="archive-panel-promos"
            role="tabpanel"
            aria-labelledby="archive-tab-promos"
            hidden={activeTab !== 'promos'}
          >
            <PromoGrid promos={visiblePromos} onOpen={setOpenPromo} />
          </div>
          <div
            id="archive-panel-photos"
            role="tabpanel"
            aria-labelledby="archive-tab-photos"
            hidden={activeTab !== 'photos'}
          >
            <PhotoGrid photos={visiblePhotos} onOpen={setOpenPhotoIdx} />
          </div>
        </div>
      </main>
      {openPromo && <PromoModal promo={openPromo} onClose={() => setOpenPromo(null)} />}
      {openPhotoIdx !== null && (
        <PhotoLightbox
          photos={visiblePhotos}
          index={openPhotoIdx}
          onClose={() => setOpenPhotoIdx(null)}
          onNavigate={setOpenPhotoIdx}
        />
      )}
    </>
  );
}

// ── Route entry point ─────────────────────────────────────────────────────

export function PastShowArchivePage() {
  const slug = window.location.pathname.replace(/^\/past\//, '').replace(/\/$/, '');
  const [result, setResult] = useState<Awaited<ReturnType<typeof loadContent>> | null>(null);

  useEffect(() => {
    loadContent(false).then(setResult);
  }, []);

  if (!result) {
    return (
      <div className="site-loading">
        <MotifStack size={84} seed={88} layers={4} jitter={7} />
        <span>Loading</span>
      </div>
    );
  }

  const show = result.content.pastShows.find((s) => s.id === slug);

  if (!show) {
    return (
      <main className="archive-main">
        <div className="wrap archive-not-found">
          <MotifStack size={70} seed={33} layers={4} jitter={8} />
          <h1 className="display">Show not found</h1>
          <p>We couldn't find that archive page.</p>
          <a className="btn btn--ghost" href="/#past">
            ← Back to Past Shows
          </a>
        </div>
      </main>
    );
  }

  return <ArchiveContent show={show} settings={result.content.settings} />;
}
