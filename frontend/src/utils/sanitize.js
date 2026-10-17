/**
 * HTML escape helper — for use in template strings that get injected as HTML
 * (react-globe.gl `pointLabel`, Leaflet popups, PostHog `capture` extra props
 * that contain user-generated text, etc.).
 *
 * ALWAYS escape user-controlled text (full_name, country, message) before it
 * lands in innerHTML / dangerouslySetInnerHTML / third-party libs that accept
 * raw HTML strings. Names/countries come from unauthenticated registration
 * and are visible to every homepage visitor — an XSS sink otherwise.
 */
export const escapeHtml = (input) => {
  if (input == null) return '';
  const str = String(input);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/`/g, '&#96;')
    .replace(/\//g, '&#x2F;');
};
