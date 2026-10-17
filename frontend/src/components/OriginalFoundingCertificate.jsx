import { useEffect, useState } from 'react';
import { X, Maximize2 } from 'lucide-react';

/**
 * OriginalFoundingCertificate
 *
 * The official "Original Founding Citizen Certificate" reference image
 * for the Lunar Birthright Project (Daniel Heslip, Lunar Citizen No. 000001).
 *
 * • Centred, responsive, high quality — never cropped.
 * • Click / tap opens a full-viewport lightbox for close inspection.
 * • Captioned with the official display text.
 * • SEO-friendly: proper `alt` text, semantic `<figure>` + `<figcaption>`.
 *
 * Props:
 *   variant   – "featured" (default, hero-sized) or "compact" (smaller for
 *               side/section usage).
 *   caption   – Override caption (defaults to official display text).
 *   className – Extra wrapper classes.
 *   testId    – Optional data-testid override.
 */
const CERT_SRC = '/founding-certificate.svg';
const CERT_ALT =
  'Lunar Birthright Founding Citizen Certificate for Daniel Heslip, Lunar Citizen No. 000001, symbolic first quarter acre of the Moon, with Digital Archive Key NFT record.';
const CERT_TITLE = 'Original Founding Citizen Certificate';
const CERT_CAPTION =
  'Original Founding Citizen Certificate — Daniel Heslip — Lunar Citizen No. 000001';

const OriginalFoundingCertificate = ({
  variant = 'featured',
  caption = CERT_CAPTION,
  className = '',
  testId = 'original-founding-certificate',
}) => {
  const [open, setOpen] = useState(false);

  // Close on ESC + lock body scroll while lightbox is open
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const maxWidth = variant === 'compact' ? 'max-w-md' : 'max-w-2xl';

  return (
    <>
      <figure
        className={`mx-auto ${maxWidth} ${className}`}
        data-testid={testId}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group relative block w-full rounded-2xl overflow-hidden bg-black shadow-[0_20px_60px_-15px_rgba(253,224,71,0.35)] ring-1 ring-yellow-500/25 hover:ring-yellow-400/60 transition-all"
          aria-label={`Enlarge ${CERT_TITLE}`}
          data-testid="founding-cert-open-lightbox"
        >
          <img
            src={CERT_SRC}
            alt={CERT_ALT}
            title={CERT_TITLE}
            loading="lazy"
            decoding="async"
            className="block w-full h-auto object-contain select-none"
            draggable={false}
            data-testid="founding-cert-image"
          />
          <span
            className="pointer-events-none absolute top-3 right-3 inline-flex items-center gap-1 rounded-md bg-black/60 backdrop-blur-sm px-2.5 py-1 text-xs font-medium text-yellow-200 opacity-0 group-hover:opacity-100 transition-opacity"
            aria-hidden="true"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            Click to enlarge
          </span>
        </button>
        <figcaption
          className="mt-3 text-center text-sm text-gray-300"
          data-testid="founding-cert-caption"
        >
          {caption}
        </figcaption>
      </figure>

      {open && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 sm:p-8 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="founding-cert-lightbox-title"
          onClick={() => setOpen(false)}
          data-testid="founding-cert-lightbox"
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 z-10 rounded-full p-2 bg-white/10 hover:bg-white/20 text-white transition"
            aria-label="Close preview"
            data-testid="founding-cert-close-lightbox"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={CERT_SRC}
            alt={CERT_ALT}
            title={CERT_TITLE}
            className="max-h-[92vh] max-w-full w-auto h-auto object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            data-testid="founding-cert-lightbox-image"
          />
          <span id="founding-cert-lightbox-title" className="sr-only">
            {CERT_TITLE}
          </span>
        </div>
      )}

      <style>{`
        @keyframes lbpFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .animate-fade-in { animation: lbpFadeIn 0.18s ease-out; }
      `}</style>
    </>
  );
};

export default OriginalFoundingCertificate;
