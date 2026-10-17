import { useEffect, useRef, useMemo, useState } from 'react';
import Globe from 'react-globe.gl';
import * as THREE from 'three';
import { escapeHtml } from '../utils/sanitize';
import { Crosshair, MapPin, Layers3, Plus, Minus } from 'lucide-react';

// Inject the "YOU ARE HERE" keyframes once, at module load. Previously these
// were duplicated inside each generated htmlElement, causing DOM bloat on
// every re-render.
if (typeof document !== 'undefined' && !document.getElementById('lbp-globe-keyframes')) {
  const styleEl = document.createElement('style');
  styleEl.id = 'lbp-globe-keyframes';
  styleEl.textContent = `
    @keyframes lbpYouHereBounce {
      0%, 100% { transform: translateY(0); }
      50%      { transform: translateY(-6px); }
    }
  `;
  document.head.appendChild(styleEl);
}

/**
 * MoonGlobe — true 3D WebGL sphere of the Moon using the high-detail
 * NASA LROC color mosaic. Auto-rotates, supports zoom/pan, and renders
 * citizen markers projected onto the sphere by lat/lon.
 *
 * Props:
 *   plots: Array<{ lunar_lat, lunar_lon, owner?, country? }>
 *   userPlot: { lunar_lat, lunar_lon } | null
 *   width, height: container size
 *   onMarkerClick: (plot) => void
 */
const MoonGlobe = ({
  plots = [],
  userPlot = null,
  focusPlot = null,
  width = 800,
  height = 600,
  onMarkerClick,
  autoRotate = true,
}) => {
  const globeEl = useRef();
  const wrapRef = useRef();
  const [size, setSize] = useState({ w: width, h: height });
  const [isHovering, setIsHovering] = useState(false);
  const [pulseTick, setPulseTick] = useState(0);
  const [showCitizenPlots, setShowCitizenPlots] = useState(true);

  // Use a real WebGL material rather than a flat image-only globe. The
  // colour map is the 8K lunar texture already shipped with the project; the
  // bump map adds restrained crater/maria depth so highlights move naturally
  // as the user rotates the Moon.
  const moonMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    roughness: 0.96,
    metalness: 0.0,
    color: 0xffffff,
  }), []);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    let disposed = false;

    const colourTexture = loader.load('/moon-surface.jpg', (texture) => {
      if (disposed) return;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 8;
      moonMaterial.map = texture;
      moonMaterial.needsUpdate = true;
    });

    const bumpTexture = loader.load('/moon-bump.jpg', (texture) => {
      if (disposed) return;
      texture.anisotropy = 4;
      moonMaterial.bumpMap = texture;
      moonMaterial.bumpScale = 2.2;
      moonMaterial.needsUpdate = true;
    });

    return () => {
      disposed = true;
      colourTexture.dispose();
      bumpTexture.dispose();
      moonMaterial.map = null;
      moonMaterial.bumpMap = null;
      moonMaterial.dispose();
    };
  }, [moonMaterial]);

  // Flash user's marker (green ↔ bright yellow) so it's easy to find on the globe
  useEffect(() => {
    if (!userPlot) return;
    const id = setInterval(() => setPulseTick((t) => (t + 1) % 1000), 350);
    return () => clearInterval(id);
  }, [userPlot]);

  // Make sphere render perfectly inside container at any breakpoint
  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver(() => {
      if (wrapRef.current) {
        const r = wrapRef.current.getBoundingClientRect();
        setSize({ w: Math.floor(r.width), h: Math.floor(r.height) });
      }
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  // Auto-rotation + initial pose
  useEffect(() => {
    if (!globeEl.current) return;
    const controls = globeEl.current.controls();
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 0.15; // slower, more readable cruise
    controls.enableZoom = true;
    controls.enablePan = false;
    controls.minDistance = 180;
    controls.maxDistance = 600;
    // Smoother feel
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.55;

    // Start angle so the visible face shows
    globeEl.current.pointOfView({ lat: 5, lng: -10, altitude: 2.2 }, 0);
  }, [autoRotate]);

  // Pause auto-rotate while the cursor is on the globe so markers are easy to read
  useEffect(() => {
    if (!globeEl.current) return;
    const controls = globeEl.current.controls();
    controls.autoRotate = autoRotate && !isHovering;
  }, [isHovering, autoRotate]);

  // Fly to an exact claimed plot, or to the preview Birth Moon region.
  useEffect(() => {
    const target = userPlot || focusPlot;
    if (!globeEl.current || !target) return;
    const controls = globeEl.current.controls();
    controls.autoRotate = false;
    globeEl.current.pointOfView(
      { lat: target.lunar_lat, lng: target.lunar_lon, altitude: userPlot ? 1.2 : 1.45 },
      1800
    );
  }, [userPlot, focusPlot]);

  // Markers data — combine citizen plots + the user marker on top
  const points = useMemo(() => {
    const all = (showCitizenPlots ? (plots || []) : []).map((p) => ({
      lat: p.lunar_lat,
      lng: p.lunar_lon,
      size: 0.34,
      color: '#D4AF37',
      label: p.owner || 'Lunar Citizen',
      country: p.country,
      isUser: false,
      raw: p,
    }));
    if (!userPlot && focusPlot && focusPlot.lunar_lat !== undefined) {
      all.push({
        lat: focusPlot.lunar_lat,
        lng: focusPlot.lunar_lon,
        size: 0.8,
        color: '#22D3EE',
        label: 'BIRTH MOON REGION',
        country: '',
        isUser: false,
        isBirthPreview: true,
        raw: focusPlot,
      });
    }
    if (userPlot && userPlot.lunar_lat !== undefined) {
      // Flash color on tick so the user can find their plot among hundreds
      const flashOn = pulseTick % 2 === 0;
      all.push({
        lat: userPlot.lunar_lat,
        lng: userPlot.lunar_lon,
        size: flashOn ? 0.95 : 0.7,
        color: flashOn ? '#FDE047' : '#22c55e',  // bright yellow ↔ green
        label: 'YOUR PLOT',
        country: '',
        isUser: true,
        raw: userPlot,
      });
    }
    return all;
  }, [plots, userPlot, focusPlot, pulseTick, showCitizenPlots]);

  // Sonar ping ring at the user's plot (propagates outward, repeats forever)
  const userRing = useMemo(() => {
    if (!userPlot || userPlot.lunar_lat === undefined) return [];
    return [{ lat: userPlot.lunar_lat, lng: userPlot.lunar_lon }];
  }, [userPlot]);

  // "YOU ARE HERE" floating label — projected onto sphere, auto-hides on back
  const youAreHereData = useMemo(() => {
    if (!userPlot || userPlot.lunar_lat === undefined) return [];
    return [{ lat: userPlot.lunar_lat, lng: userPlot.lunar_lon }];
  }, [userPlot]);

  const makeYouAreHereElement = () => {
    const el = document.createElement('div');
    el.innerHTML = `
      <div style="
        position: relative;
        transform: translate(-50%, -100%);
        font-family: system-ui, -apple-system, sans-serif;
        pointer-events: none;
        user-select: none;
        white-space: nowrap;
      ">
        <div style="
          background: linear-gradient(135deg, #FDE047 0%, #FBBF24 100%);
          color: #0a0a1a;
          font-weight: 800;
          font-size: 11px;
          letter-spacing: 1.2px;
          padding: 6px 12px;
          border-radius: 999px;
          box-shadow: 0 4px 18px rgba(253, 224, 71, 0.55), 0 0 0 2px rgba(253, 224, 71, 0.25);
          animation: lbpYouHereBounce 1.4s ease-in-out infinite;
        ">★ YOU ARE HERE ★</div>
        <div style="
          width: 0; height: 0;
          margin: -2px auto 0;
          border-left: 7px solid transparent;
          border-right: 7px solid transparent;
          border-top: 9px solid #FBBF24;
          filter: drop-shadow(0 2px 4px rgba(253, 224, 71, 0.5));
        "></div>
      </div>
    `;
    return el;
  };

  // Custom black space background ring with subtle glow
  const onGlobeReady = () => {
    if (!globeEl.current) return;
    const scene = globeEl.current.scene();
    // Directional "sun" plus very low ambient light gives a natural lunar
    // terminator and lets crater rims catch highlights as the globe rotates.
    const dir = new THREE.DirectionalLight(0xfff8e8, 2.25);
    dir.position.set(-4, 3.25, 5.5);
    scene.add(dir);
    const fill = new THREE.DirectionalLight(0x8aa3c7, 0.22);
    fill.position.set(4, -1.5, -3);
    scene.add(fill);
    const ambient = new THREE.AmbientLight(0xffffff, 0.12);
    scene.add(ambient);
  };

  const centerMoon = () => {
    if (!globeEl.current) return;
    globeEl.current.controls().autoRotate = false;
    globeEl.current.pointOfView({ lat: 0, lng: 0, altitude: 2.05 }, 900);
  };

  const findMyPlot = () => {
    if (!globeEl.current || !userPlot || userPlot.lunar_lat === undefined) return;
    globeEl.current.controls().autoRotate = false;
    globeEl.current.pointOfView(
      { lat: userPlot.lunar_lat, lng: userPlot.lunar_lon, altitude: 1.05 },
      1200
    );
  };

  const adjustZoom = (delta) => {
    if (!globeEl.current) return;
    const pov = globeEl.current.pointOfView() || { lat: 0, lng: 0, altitude: 2.05 };
    const current = Number(pov.altitude) || 2.05;
    const next = Math.max(0.72, Math.min(3.8, current + delta));
    globeEl.current.pointOfView({ lat: pov.lat || 0, lng: pov.lng || 0, altitude: next }, 260);
  };

  return (
    <div
      ref={wrapRef}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className="w-full h-full relative"
      style={{
        background:
          'radial-gradient(circle at 18% 24%, rgba(255,255,255,0.7) 0 1px, transparent 1.5px), radial-gradient(circle at 78% 18%, rgba(255,255,255,0.55) 0 1px, transparent 1.5px), radial-gradient(circle at 62% 72%, rgba(255,255,255,0.48) 0 1px, transparent 1.5px), radial-gradient(ellipse at 30% 20%, #0b0b16 0%, #05050a 58%, #000 100%)',
        backgroundSize: '180px 180px, 260px 260px, 330px 330px, auto',
      }}
    >
      <Globe
        ref={globeEl}
        width={size.w}
        height={size.h}
        backgroundColor="rgba(0,0,0,0)"
        globeMaterial={moonMaterial}
        showAtmosphere={false}
        pointsData={points}
        pointLat="lat"
        pointLng="lng"
        pointAltitude={0.012}
        pointColor="color"
        pointRadius="size"
        pointResolution={8}
        ringsData={userRing}
        ringLat="lat"
        ringLng="lng"
        ringAltitude={0.012}
        ringMaxRadius={6}
        ringPropagationSpeed={2.4}
        ringRepeatPeriod={900}
        ringColor={() => (t) => `rgba(253, 224, 71, ${1 - t})`}
        ringResolution={64}
        htmlElementsData={youAreHereData}
        htmlLat="lat"
        htmlLng="lng"
        htmlAltitude={0.05}
        htmlElement={makeYouAreHereElement}
        pointLabel={(d) =>
          `<div style="background:rgba(8,8,10,0.96);padding:10px 14px;border-radius:10px;border:1.5px solid ${d.isUser ? '#22c55e' : d.isBirthPreview ? '#67E8F9' : '#D4AF37'};color:white;font-size:14px;line-height:1.35;box-shadow:0 8px 24px rgba(0,0,0,0.6),0 0 20px rgba(212,175,55,0.1);font-family:system-ui,-apple-system,sans-serif;white-space:nowrap;">
            ${d.isUser
              ? '<div style="color:#22c55e;font-weight:700;font-size:12px;letter-spacing:0.5px;margin-bottom:4px;">★ YOUR PLOT ★</div>'
              : d.isBirthPreview
                ? '<div style="color:#67E8F9;font-weight:700;font-size:11px;letter-spacing:0.6px;margin-bottom:4px;text-transform:uppercase;">Birth Moon Preview</div>'
                : '<div style="color:#E7C968;font-weight:600;font-size:11px;letter-spacing:0.6px;margin-bottom:4px;text-transform:uppercase;">Lunar Citizen Plot</div>'}
            <div style="font-weight:600;font-size:15px;">${escapeHtml(d.label)}</div>
            ${d.country ? `<div style="color:#9CA3AF;font-size:12px;margin-top:3px;">${escapeHtml(d.country)}</div>` : ''}
          </div>`
        }
        onPointHover={(p) => {
          // While hovering a marker, freeze rotation entirely for readability
          if (globeEl.current) {
            globeEl.current.controls().autoRotate = autoRotate && !p && !isHovering;
          }
        }}
        onPointClick={(p) => onMarkerClick && onMarkerClick(p.raw)}
        onGlobeReady={onGlobeReady}
        rendererConfig={{ antialias: true, alpha: true }}
      />

      {/* Premium explorer controls — mirrored from the approved V4 visual. */}
      <div className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2 rounded-2xl border border-yellow-500/30 bg-black/55 backdrop-blur-md p-2 shadow-xl">
        <button
          type="button"
          onClick={() => adjustZoom(-0.22)}
          className="w-10 h-10 rounded-xl border border-white/10 bg-white/5 hover:bg-yellow-500/15 text-yellow-300 flex items-center justify-center transition"
          aria-label="Zoom in"
          title="Zoom in"
        >
          <Plus className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={() => adjustZoom(0.22)}
          className="w-10 h-10 rounded-xl border border-white/10 bg-white/5 hover:bg-yellow-500/15 text-yellow-300 flex items-center justify-center transition"
          aria-label="Zoom out"
          title="Zoom out"
        >
          <Minus className="w-5 h-5" />
        </button>
      </div>

      <div className="absolute left-1/2 -translate-x-1/2 bottom-10 sm:bottom-7 z-20 w-[calc(100%-2rem)] max-w-2xl grid grid-cols-3 gap-2 rounded-2xl border border-yellow-500/25 bg-black/60 backdrop-blur-lg p-2 shadow-2xl">
        <button
          type="button"
          onClick={centerMoon}
          className="min-h-12 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold transition"
        >
          <Crosshair className="w-4 h-4 text-yellow-300" />
          <span>Center</span><span className="hidden sm:inline"> Moon</span>
        </button>
        <button
          type="button"
          onClick={findMyPlot}
          disabled={!userPlot}
          className="min-h-12 rounded-xl border border-yellow-400/50 bg-yellow-500/15 hover:bg-yellow-500/25 disabled:opacity-35 disabled:cursor-not-allowed text-yellow-200 flex items-center justify-center gap-2 text-xs sm:text-sm font-bold transition"
          title={userPlot ? 'Fly to your symbolic lunar plot' : 'Claim or log in to enable Find My Plot'}
        >
          <MapPin className="w-4 h-4" />
          <span>Find My Plot</span>
        </button>
        <button
          type="button"
          onClick={() => setShowCitizenPlots((v) => !v)}
          className={`min-h-12 rounded-xl border text-white/80 flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold transition ${showCitizenPlots ? 'border-yellow-500/35 bg-yellow-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
          aria-pressed={showCitizenPlots}
        >
          <Layers3 className="w-4 h-4 text-yellow-300" />
          <span className="hidden sm:inline">Plot </span><span>Layers</span>
        </button>
      </div>
    </div>
  );
};

export default MoonGlobe;
