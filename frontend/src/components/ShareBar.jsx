import { useState } from 'react';
import { Copy, Check, Mail, Link as LinkIcon } from 'lucide-react';
import { track } from '../utils/analytics';

/**
 * Universal share bar — 7 platforms + copy-link, with analytics wiring.
 *
 * Props:
 *   url          Public URL to share (defaults to www.lunarbirthrightproject.com)
 *   text         Body/pre-filled message
 *   source       Analytics label — where the bar is rendered from
 *                (e.g. 'success-celebration', 'certificate-page', 'registry-page')
 *   referralCode Optional — appended as ?ref=CODE to the URL when present
 *   compact      Boolean — smaller pill layout for dense UI
 */
const SharePlatform = ({ id, label, href, bg, onClick, testId, children }) => (
  <a
    href={href}
    target={href ? '_blank' : undefined}
    rel={href ? 'noopener noreferrer' : undefined}
    onClick={onClick}
    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-white text-sm font-semibold transition-transform hover:scale-105 ${bg}`}
    data-testid={testId || `share-btn-${id}`}
    aria-label={`Share on ${label}`}
  >
    {children}
    <span className="hidden sm:inline">{label}</span>
  </a>
);

const ShareBar = ({
  url = 'https://www.lunarbirthrightproject.com',
  text = 'I just claimed my symbolic place on the Moon with the Lunar Birthright Project. Claim yours free:',
  source = 'unknown',
  referralCode = '',
  compact = false,
}) => {
  const [copied, setCopied] = useState(false);

  const finalUrl = referralCode
    ? `${url}${url.includes('?') ? '&' : '?'}ref=${encodeURIComponent(referralCode)}`
    : url;
  const shareText = `${text} ${finalUrl}`;
  const encodedText = encodeURIComponent(text);
  const encodedUrl = encodeURIComponent(finalUrl);
  const encodedShareText = encodeURIComponent(shareText);

  const emitShare = (platform) => {
    track('share_clicked', {
      platform,
      source,
      referral_code: referralCode || undefined,
    });
  };

  const copyLink = async (e) => {
    e?.preventDefault?.();
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      emitShare('copy');
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('clipboard failed:', err?.message);
      }
    }
  };

  const pad = compact ? 'p-3' : 'p-4';
  const gap = compact ? 'gap-1.5' : 'gap-2';

  return (
    <div className={`${pad} bg-white/5 border border-white/10 rounded-xl`} data-testid="share-bar">
      <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Share your Lunar Birthright</p>
      <div className={`flex flex-wrap ${gap}`}>
        <SharePlatform
          id="twitter" label="X" bg="bg-black hover:bg-gray-900"
          href={`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`}
          onClick={() => emitShare('twitter')}
        >
          <span className="font-black text-base leading-none">𝕏</span>
        </SharePlatform>

        <SharePlatform
          id="facebook" label="Facebook" bg="bg-[#1877F2] hover:bg-[#155cc4]"
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`}
          onClick={() => emitShare('facebook')}
        >
          <FBIcon />
        </SharePlatform>

        <SharePlatform
          id="messenger" label="Messenger" bg="bg-[#0084FF] hover:bg-[#006ad1]"
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
          onClick={() => emitShare('messenger')}
        >
          <MessengerIcon />
        </SharePlatform>

        <SharePlatform
          id="linkedin" label="LinkedIn" bg="bg-[#0A66C2] hover:bg-[#084b8f]"
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
          onClick={() => emitShare('linkedin')}
        >
          <LinkedInIcon />
        </SharePlatform>

        <SharePlatform
          id="whatsapp" label="WhatsApp" bg="bg-[#25D366] hover:bg-[#1eb655]"
          href={`https://wa.me/?text=${encodedShareText}`}
          onClick={() => emitShare('whatsapp')}
        >
          <WhatsAppIcon />
        </SharePlatform>

        <SharePlatform
          id="email" label="Email" bg="bg-gray-700 hover:bg-gray-600"
          href={`mailto:?subject=${encodeURIComponent('My Lunar Birthright')}&body=${encodedShareText}`}
          onClick={() => emitShare('email')}
        >
          <Mail className="w-4 h-4" />
        </SharePlatform>

        <button
          onClick={copyLink}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-white text-sm font-semibold transition-transform hover:scale-105 bg-yellow-500 text-black hover:bg-yellow-400"
          data-testid="share-btn-copy"
          aria-label="Copy share link"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>

      {referralCode && (
        <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
          <LinkIcon className="w-3 h-3" />
          Referral link: <code className="text-yellow-400/90">?ref={referralCode}</code>
        </p>
      )}
    </div>
  );
};

/* ---------- Inline SVG icons (avoid extra icon-lib payload) ---------- */
const FBIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
    <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.77l-.44 2.89h-2.33v6.99A10 10 0 0 0 22 12z" />
  </svg>
);
const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
    <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.63-1.85 3.35-1.85 3.58 0 4.24 2.36 4.24 5.42v6.32zM5.34 7.44a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM3.56 20.45h3.55V9H3.56v11.45zM22.22 0H1.78C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.78 24h20.44c.99 0 1.78-.77 1.78-1.72V1.72C24 .77 23.21 0 22.22 0z" />
  </svg>
);
const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413" />
  </svg>
);
const MessengerIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
    <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.497 1.745 6.616 4.472 8.652V24l4.086-2.242c1.09.301 2.246.464 3.442.464 6.627 0 12-4.974 12-11.111C24 4.974 18.627 0 12 0zm1.192 14.963l-3.056-3.259-5.963 3.259 6.559-6.963 3.13 3.259 5.889-3.259-6.559 6.963z" />
  </svg>
);

export default ShareBar;
