import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  buildPlotMarkerIcon, buildPlotPopupHtml, loadFirstAvailableMoonImage,
} from './moonMap/leafletHelpers';

const IMAGE_BOUNDS = [[-90, -180], [90, 180]];
const MOON_IMAGE_FALLBACKS = [
  '/moon-surface.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/e/e1/FullMoon2010.jpg',
];

const containerStyle = {
  width: '100%',
  height: '500px',
  borderRadius: '12px',
  border: '3px solid rgba(96, 165, 250, 0.3)',
  boxShadow: '0 8px 32px rgba(96, 165, 250, 0.2)',
  overflow: 'hidden',
  background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a3a 50%, #0a0a1a 100%)',
};

const ErrorFallback = ({ latitude, longitude }) => (
  <div className="moon-map-container" data-testid="moon-map-component">
    <div style={{ ...containerStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div className="text-6xl mb-4">🌙</div>
      <p className="text-white text-xl font-bold">Your Lunar Plot</p>
      <p className="text-blue-400 mt-2">Lat: {latitude.toFixed(6)}° | Lon: {longitude.toFixed(6)}°</p>
      <p className="text-gray-400 mt-2">0.25 acres (1,012 m²)</p>
    </div>
  </div>
);

const MoonMap = ({ latitude, longitude }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return undefined;

    const timer = setTimeout(() => {
      if (!mapRef.current || mapInstanceRef.current) return;
      try {
        const map = L.map(mapRef.current, {
          crs: L.CRS.EPSG4326,
          center: [latitude, longitude],
          zoom: 2,
          minZoom: 1,
          maxZoom: 5,
          maxBounds: IMAGE_BOUNDS,
          maxBoundsViscosity: 1.0,
        });
        mapInstanceRef.current = map;

        loadFirstAvailableMoonImage(map, MOON_IMAGE_FALLBACKS, IMAGE_BOUNDS);

        const marker = L.marker([latitude, longitude], { icon: buildPlotMarkerIcon() }).addTo(map);
        marker.bindPopup(buildPlotPopupHtml(latitude, longitude), { maxWidth: 250 });
        // Note: YOU ARE HERE label is now baked into the marker icon (always visible).
        // The popup opens on click; we no longer auto-open/auto-close it.

        map.setView([latitude, longitude], 3);
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error initializing map:', err);
        }
        setError(true);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        try { mapInstanceRef.current.remove(); }
        catch (cleanupErr) {
          if (process.env.NODE_ENV === 'development') {
            console.debug('Map cleanup:', cleanupErr?.message);
          }
        }
        mapInstanceRef.current = null;
      }
    };
  }, [latitude, longitude]);

  if (error) return <ErrorFallback latitude={latitude} longitude={longitude} />;

  return (
    <div className="moon-map-container" data-testid="moon-map-component">
      <div ref={mapRef} style={containerStyle} data-testid="moon-map-canvas" />
      <div className="mt-4 text-center space-y-2">
        <p className="text-sm text-blue-300 font-semibold flex items-center justify-center gap-2">
          <span className="text-xl">🌙</span>
          <span>Your Lunar Birthright Location</span>
        </p>
        <p className="text-xs text-gray-400">
          Coordinates: {latitude.toFixed(6)}°, {longitude.toFixed(6)}° • Area: 0.25 acres (1,012 m²)
        </p>
        <div className="mt-3 flex gap-4 justify-center text-xs text-gray-500 bg-gray-900/30 py-2 px-4 rounded-lg inline-flex flex-wrap">
          <span className="flex items-center gap-1"><span className="text-blue-400">🔍</span> Zoom: Scroll / +/- buttons</span>
          <span>•</span>
          <span className="flex items-center gap-1"><span className="text-blue-400">🖱️</span> Pan: Click & drag</span>
          <span>•</span>
          <span className="flex items-center gap-1"><span className="text-blue-400">📍</span> Click marker for details</span>
        </div>
      </div>
      <style>{`
        .leaflet-container {
          background: linear-gradient(135deg, #0a0a1a 0%, #1a1a3a 50%, #0a0a1a 100%) !important;
        }
      `}</style>
    </div>
  );
};

export default MoonMap;
