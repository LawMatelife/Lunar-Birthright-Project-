/**
 * Analytics helper — thin wrapper around PostHog (loaded via public/index.html).
 * Safe to call before PostHog is ready; events queue up automatically.
 *
 * Named events used across the app:
 *   homepage_view
 *   claim_started
 *   claim_completed
 *   certificate_downloaded
 *   share_clicked            (properties: { platform, source, referral_code? })
 *   referral_visit           (properties: { referral_code })
 */

const isBrowser = typeof window !== 'undefined';

export const track = (eventName, properties = {}) => {
  if (!isBrowser) return;
  try {
    if (window.posthog && typeof window.posthog.capture === 'function') {
      window.posthog.capture(eventName, properties);
    }
    // Also fire a generic dataLayer push so GTM (if ever added) picks it up.
    if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push({ event: eventName, ...properties });
    }
  } catch (err) {
    // Analytics must never break the app
    if (process.env.NODE_ENV === 'development') {
      console.debug('analytics.track failed:', err?.message);
    }
  }
};

export const identify = (userId, traits = {}) => {
  if (!isBrowser) return;
  try {
    if (window.posthog && typeof window.posthog.identify === 'function') {
      window.posthog.identify(userId, traits);
    }
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.debug('analytics.identify failed:', err?.message);
    }
  }
};
