import L from 'leaflet';

// Local HTML escape — dashboard MoonMap only uses static labels today, but
// callers may pass user-controlled text in future and this is a raw-HTML sink.
const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/**
 * Build a glowing pulse marker icon for the user's plot location.
 * Matches the 3D globe's "YOU ARE HERE" beacon — flashing yellow/green core,
 * sonar ring, and a bouncing yellow pill label.
 * Pure function — returns a Leaflet DivIcon instance.
 */
export const buildPlotMarkerIcon = (label = 'YOU ARE HERE') =>
  L.divIcon({
    className: 'custom-plot-marker',
    html: `
      <div style="position: relative; z-index: 1000; width: 0; height: 0;">
        <!-- Sonar ping (outermost, expanding ring) -->
        <div style="
          position: absolute; width: 24px; height: 24px;
          border: 2px solid #FDE047; border-radius: 50%;
          top: 50%; left: 50%; transform: translate(-50%, -50%);
          animation: lbpSonar 1.6s ease-out infinite;
          pointer-events: none;
        "></div>
        <div style="
          position: absolute; width: 24px; height: 24px;
          border: 2px solid #FDE047; border-radius: 50%;
          top: 50%; left: 50%; transform: translate(-50%, -50%);
          animation: lbpSonar 1.6s ease-out infinite;
          animation-delay: 0.8s;
          pointer-events: none;
        "></div>

        <!-- Glow halo behind the core -->
        <div style="
          position: absolute; width: 28px; height: 28px; border-radius: 50%;
          top: 50%; left: 50%; transform: translate(-50%, -50%);
          background: radial-gradient(circle, rgba(253, 224, 71, 0.55) 0%, rgba(253, 224, 71, 0) 70%);
          animation: lbpHalo 1s ease-in-out infinite alternate;
          pointer-events: none;
        "></div>

        <!-- Flashing core: green ↔ bright yellow -->
        <div style="
          position: absolute; width: 16px; height: 16px; border-radius: 50%;
          top: 50%; left: 50%; transform: translate(-50%, -50%);
          background: #22c55e;
          box-shadow: 0 0 14px rgba(34, 197, 94, 0.9);
          animation: lbpFlash 0.7s steps(1) infinite;
          z-index: 2;
        "></div>

        <!-- Bouncing YOU ARE HERE label -->
        <div style="
          position: absolute; top: -52px; left: 50%; transform: translateX(-50%);
          animation: lbpYouHereBounce 1.4s ease-in-out infinite;
          z-index: 3; pointer-events: none;
        ">
          <div style="
            background: linear-gradient(135deg, #FDE047 0%, #FBBF24 100%);
            color: #0a0a1a; font-weight: 800; font-size: 11px;
            letter-spacing: 1.2px; padding: 6px 12px; border-radius: 999px;
            box-shadow: 0 4px 18px rgba(253, 224, 71, 0.55), 0 0 0 2px rgba(253, 224, 71, 0.25);
            white-space: nowrap;
            font-family: system-ui, -apple-system, sans-serif;
          ">★ ${esc(label)} ★</div>
          <div style="
            width: 0; height: 0;
            margin: -2px auto 0;
            border-left: 7px solid transparent;
            border-right: 7px solid transparent;
            border-top: 9px solid #FBBF24;
            filter: drop-shadow(0 2px 4px rgba(253, 224, 71, 0.5));
          "></div>
        </div>
      </div>
      <style>
        @keyframes lbpSonar {
          0%   { width: 16px; height: 16px; opacity: 0.9; }
          100% { width: 80px; height: 80px; opacity: 0;   }
        }
        @keyframes lbpHalo {
          0%   { opacity: 0.6; transform: translate(-50%, -50%) scale(0.95); }
          100% { opacity: 1;   transform: translate(-50%, -50%) scale(1.15); }
        }
        @keyframes lbpFlash {
          0%, 49%   { background: #22c55e; box-shadow: 0 0 14px rgba(34, 197, 94, 0.9); width: 16px; height: 16px; }
          50%, 99%  { background: #FDE047; box-shadow: 0 0 22px rgba(253, 224, 71, 1);  width: 20px; height: 20px; }
        }
        @keyframes lbpYouHereBounce {
          0%, 100% { transform: translate(-50%, 0); }
          50%      { transform: translate(-50%, -6px); }
        }
      </style>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -20],
  });

/**
 * Build the rich HTML for the marker's popup.
 */
export const buildPlotPopupHtml = (latitude, longitude) => `
  <div style="text-align: center; color: #1a1a2e; padding: 8px;">
    <div style="font-size: 16px; font-weight: bold; margin-bottom: 8px; color: #667eea;">
      🌙 Your Lunar Plot
    </div>
    <div style="background: #f0f4f8; padding: 8px; border-radius: 6px; margin-bottom: 6px;">
      <div style="font-size: 12px; color: #666;">Coordinates</div>
      <div style="font-weight: 600;">Lat: ${latitude.toFixed(6)}°</div>
      <div style="font-weight: 600;">Lon: ${longitude.toFixed(6)}°</div>
    </div>
    <div style="font-size: 13px; color: #888;">
      📏 0.25 acres (1,012 m²)
    </div>
  </div>
`;

/**
 * Try a chain of moon image URLs and add the first one that loads to the map.
 * Returns a promise that resolves when an image succeeds (or all fail).
 */
export const loadFirstAvailableMoonImage = (map, urls, bounds) =>
  new Promise((resolve) => {
    let i = 0;
    const tryNext = () => {
      if (i >= urls.length) { resolve(false); return; }
      const probe = new Image();
      probe.crossOrigin = 'anonymous';
      probe.onload = () => {
        try {
          L.imageOverlay(urls[i], bounds, {
            attribution: '© NASA/Wikimedia',
            opacity: 1.0,
            interactive: false,
          }).addTo(map);
          resolve(true);
        } catch {
          i += 1;
          tryNext();
        }
      };
      probe.onerror = () => { i += 1; tryNext(); };
      probe.src = urls[i];
    };
    tryNext();
  });
