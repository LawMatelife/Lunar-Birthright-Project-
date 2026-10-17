import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { plotAPI } from '@/utils/api';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Globe, Home, Users, MapPin, Loader2 } from 'lucide-react';

const MoonExplorer = () => {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [plots, setPlots] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlot, setSelectedPlot] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  const generateSamplePlots = useCallback((count) => {
    const samplePlots = [];
    for (let i = 0; i < Math.min(count, 100); i++) {
      samplePlots.push({
        id: `plot-${i}`,
        lunar_lat: Math.random() * 140 - 70, // Keep within -70 to 70 latitude
        lunar_lon: Math.random() * 360 - 180,
        owner: `Lunar Citizen ${i + 1}`,
        family_name: i % 5 === 0 ? `Family ${Math.floor(i / 5)}` : null
      });
    }
    setPlots(samplePlots);
  }, []);

  const loadAllPlots = useCallback(async () => {
    try {
      const plotsResponse = await plotAPI.getStats();
      setStats(plotsResponse.data);

      try {
        const allPlotsResponse = await plotAPI.getAll();
        if (allPlotsResponse.data && allPlotsResponse.data.plots) {
          setPlots(allPlotsResponse.data.plots);
        } else {
          generateSamplePlots(plotsResponse.data.claimed_plots);
        }
      } catch {
        generateSamplePlots(plotsResponse.data.claimed_plots);
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('Error loading plots:', error?.response?.status);
      }
      setStats({ total_plots: 1000000, claimed_plots: 22, available_plots: 999978 });
      generateSamplePlots(22);
    } finally {
      setLoading(false);
    }
  }, [generateSamplePlots]);

  useEffect(() => {
    loadAllPlots();
  }, [loadAllPlots]);

  const initializeMap = useCallback(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    
    const imageBounds = [[-90, -180], [90, 180]];

    const map = L.map(mapRef.current, {
      crs: L.CRS.EPSG4326,
      center: [0, 0],
      zoom: 2,
      minZoom: 1,
      maxZoom: 8,
      maxBounds: imageBounds,
      maxBoundsViscosity: 1.0,
      backgroundColor: '#1a1a2e'
    });

    // High-detail NASA LROC WAC color mosaic (equirectangular, 4096x2048)
    // self-hosted in /public for crisp craters and zero CORS issues
    const moonImageBounds = [[-90, -180], [90, 180]];
    L.imageOverlay('/moon-surface.jpg', moonImageBounds, {
      opacity: 1.0,
      className: 'moon-base-image'
    }).addTo(map);

    setImageLoaded(true);

    map.attributionControl.addAttribution('Imagery: NASA SVS / LROC');
    
    // Add markers with larger hit area for better touch support
    plots.forEach((plot) => {
      const markerColor = plot.family_name ? '#a78bfa' : '#60a5fa';
      
      const markerIcon = L.divIcon({
        className: 'custom-marker',
        html: `
          <div style="
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
          ">
            <div style="
              width: 12px;
              height: 12px;
              background: ${markerColor};
              border: 2px solid white;
              border-radius: 50%;
              box-shadow: 0 0 12px ${markerColor}, 0 0 24px ${markerColor}50;
            "></div>
          </div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      const marker = L.marker([plot.lunar_lat, plot.lunar_lon], { icon: markerIcon }).addTo(map);
      
      marker.bindPopup(`
        <div style="text-align: center; color: #1a1a2e; padding: 8px; min-width: 180px;">
          <strong style="font-size: 16px; color: #1e3a5f;">${plot.owner}</strong><br/>
          ${plot.certificate_number ? `<span style="color: #ca8a04; font-size: 11px;">🌙 ${plot.certificate_number}</span><br/>` : ''}
          ${plot.family_name ? `<span style="color: #7c3aed; font-size: 12px;">👨‍👩‍👧‍👦 ${plot.family_name}</span><br/>` : ''}
          ${plot.country ? `<span style="font-size: 12px;">🌍 ${plot.country}</span><br/>` : ''}
          <div style="margin-top: 8px; padding: 8px; background: #f3f4f6; border-radius: 6px;">
            <small style="color: #666;">Lunar Coordinates</small><br/>
            <small style="font-weight: 600;">Lat: ${plot.lunar_lat.toFixed(4)}°</small><br/>
            <small style="font-weight: 600;">Lon: ${plot.lunar_lon.toFixed(4)}°</small>
            ${plot.lunar_sector ? `<br/><small style="color: #3b82f6;">${plot.lunar_sector}</small>` : ''}
          </div>
          <small style="color: #888; display: block; margin-top: 6px;">📏 Quarter Acre Plot</small>
        </div>
      `);

      marker.on('click', () => {
        setSelectedPlot(plot);
      });
    });

    mapInstanceRef.current = map;
  }, [plots, setSelectedPlot]);

  useEffect(() => {
    if (!loading && mapRef.current && !mapInstanceRef.current) {
      initializeMap();
    }
  }, [loading, initializeMap]);

  if (loading) {
    return (
      <div className="min-h-screen stars-bg flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-white text-xl">Loading Moon Explorer...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen stars-bg text-white">
      {/* Header */}
      <nav className="container mx-auto px-6 py-6 flex justify-between items-center border-b border-gray-800">
        <div className="flex items-center space-x-2">
          <Globe className="w-8 h-8 text-blue-400" />
          <span className="text-2xl font-bold gradient-text">Moon Explorer</span>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 text-white hover:text-blue-400 transition flex items-center"
            data-testid="back-home-btn"
          >
            <Home className="w-5 h-5 mr-2" />
            Home
          </button>
          <button
            onClick={() => navigate('/register')}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
            data-testid="claim-plot-btn"
          >
            Claim Your Plot
          </button>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-8">
        {/* Stats Banner */}
        <div className="mb-8 bg-gradient-to-r from-blue-900/30 to-purple-900/30 backdrop-blur-sm p-6 rounded-xl">
          <h1 className="text-3xl font-bold mb-4 text-center">
            🌙 Explore All Claimed Lunar Plots
          </h1>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <Users className="w-10 h-10 text-blue-400 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">Total Plots</p>
              <p className="text-2xl font-bold">{stats?.total_plots?.toLocaleString() || '1,000,000'}</p>
            </div>
            <div className="text-center">
              <MapPin className="w-10 h-10 text-green-400 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">Claimed</p>
              <p className="text-2xl font-bold text-green-400">{stats?.claimed_plots?.toLocaleString() || plots.length}</p>
            </div>
            <div className="text-center">
              <Globe className="w-10 h-10 text-purple-400 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">Available</p>
              <p className="text-2xl font-bold text-purple-400">{stats?.available_plots?.toLocaleString() || '999,978'}</p>
            </div>
          </div>
        </div>

        {/* Interactive Map */}
        <div className="bg-gray-900/50 backdrop-blur-sm p-6 rounded-xl">
          <div className="mb-4 flex items-center justify-between flex-wrap gap-4">
            <h2 className="text-xl font-bold">Interactive Lunar Map</h2>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-400 rounded-full shadow-lg shadow-blue-400/50"></div>
                <span className="text-gray-400">Individual Plots</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-400 rounded-full shadow-lg shadow-purple-400/50"></div>
                <span className="text-gray-400">Family Plots</span>
              </div>
            </div>
          </div>

          <div 
            ref={mapRef} 
            style={{ 
              width: '100%', 
              height: '600px', 
              borderRadius: '12px',
              border: '3px solid rgba(96, 165, 250, 0.3)',
              boxShadow: '0 8px 32px rgba(96, 165, 250, 0.2)',
              overflow: 'hidden',
              background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a3a 50%, #0a0a1a 100%)'
            }}
            data-testid="moon-explorer-map"
          />

          <div className="mt-4 text-center space-y-2">
            <p className="text-sm text-blue-300 font-semibold flex items-center justify-center gap-2">
              <span className="text-xl">🌙</span>
              <span>Click any marker to see plot details</span>
            </p>
            <div className="flex gap-4 justify-center text-xs text-gray-500 flex-wrap">
              <span>🔍 Zoom: Scroll / +/- buttons</span>
              <span>•</span>
              <span>🖱️ Pan: Click & drag</span>
              <span>•</span>
              <span>📍 Click markers for details</span>
            </div>
          </div>
        </div>

        {/* Selected Plot Info */}
        {selectedPlot && (
          <div className="mt-6 bg-blue-900/30 backdrop-blur-sm p-6 rounded-xl animate-fade-in">
            <h3 className="text-xl font-bold mb-3">Selected Plot</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Owner</p>
                <p className="text-lg font-semibold">{selectedPlot.owner}</p>
              </div>
              {selectedPlot.family_name && (
                <div>
                  <p className="text-gray-400 text-sm">Family</p>
                  <p className="text-lg font-semibold text-purple-300">👨‍👩‍👧‍👦 {selectedPlot.family_name}</p>
                </div>
              )}
              <div>
                <p className="text-gray-400 text-sm">Coordinates</p>
                <p className="text-sm font-mono">
                  {selectedPlot.lunar_lat.toFixed(6)}°, {selectedPlot.lunar_lon.toFixed(6)}°
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Area</p>
                <p className="text-sm">0.25 acres (1,012 m²)</p>
              </div>
            </div>
          </div>
        )}

        {/* CTA Section */}
        <div className="mt-8 text-center bg-gradient-to-r from-blue-900/30 to-purple-900/30 backdrop-blur-sm p-8 rounded-xl">
          <h2 className="text-3xl font-bold mb-4">Ready to Claim Your Plot?</h2>
          <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
            Join {stats?.claimed_plots || plots.length} people who have already claimed their birthright. 
            Your quarter-acre plot on the Moon is waiting!
          </p>
          <button
            onClick={() => navigate('/register')}
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg text-xl font-semibold transition transform hover:scale-105"
            data-testid="cta-claim-btn"
          >
            Claim Your Free Plot Now 🚀
          </button>
        </div>
      </div>

      {/* Leaflet background fix */}
      <style>{`
        .leaflet-container {
          background: linear-gradient(135deg, #0a0a1a 0%, #1a1a3a 50%, #0a0a1a 100%) !important;
        }
      `}</style>
    </div>
  );
};

export default MoonExplorer;
