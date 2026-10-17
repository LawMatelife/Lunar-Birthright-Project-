import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI, certificateAPI, registryAPI, plotAPI, birthMoonAPI } from '@/utils/api';
import { track } from '@/utils/analytics';
import OriginalFoundingCertificate from '@/components/OriginalFoundingCertificate';
import MoonGlobe from '@/components/MoonGlobe';
import { Loader2, Check, Gift, Twitter, Facebook, Copy, ChevronDown, MapPin, Star, Award } from 'lucide-react';

const LunaLandingPage = ({ initialGiftMode = false }) => {
  const navigate = useNavigate();
  
  // Live stats
  const [counter, setCounter] = useState({ total_registered: 0, total_countries: 0 });
  const [plots, setPlots] = useState([]);

  // Funnel state
  const [funnelStep, setFunnelStep] = useState('hero');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [giftMode, setGiftMode] = useState(initialGiftMode);
  const [selectedPlot, setSelectedPlot] = useState(null);

  // Form data
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    birth_date: '',
    country: '',
    message: '',
    gift_occasion: 'Birthday'
  });

  // Claim result
  const [claimResult, setClaimResult] = useState(null);
  const [userToken, setUserToken] = useState(null);
  // Lat/lon of newly-claimed plot — drives MoonGlobe flyTo + green pulse marker
  const [userPlot, setUserPlot] = useState(null);
  const [birthMoonPreview, setBirthMoonPreview] = useState(null);
  const [birthMoonPreviewLoading, setBirthMoonPreviewLoading] = useState(false);

  const claimSectionRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    track(initialGiftMode ? 'gift_page_view' : 'homepage_view');
    // Capture referral visits (?ref=CODE) so we can attribute later conversions.
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref');
      if (ref) {
        track('referral_visit', { referral_code: ref });
        // Persist for the eventual claim so the backend can pair them up
        sessionStorage.setItem('lbp_ref', ref);
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('referral capture failed:', err?.message);
      }
    }
  }, [initialGiftMode]);

  const loadCounter = useCallback(async () => {
    try {
      const response = await registryAPI.getCounter();
      setCounter(response.data);
    } catch (err) {
      // Counter loading failed - non-critical, use defaults
      if (process.env.NODE_ENV === 'development') {
        console.debug('Counter load failed:', err?.message);
      }
    }
  }, []);

  const loadPlots = useCallback(async () => {
    try {
      const response = await plotAPI.getAll();
      setPlots(response.data.plots || []);
    } catch (err) {
      // Plots loading failed - non-critical
      if (process.env.NODE_ENV === 'development') {
        console.debug('Plots load failed:', err?.message);
      }
    }
  }, []);

  useEffect(() => {
    loadCounter();
    loadPlots();
    const interval = setInterval(() => {
      loadCounter();
      loadPlots();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadCounter, loadPlots]);

  // If user is already logged in (returning visitor), fetch their plot so the
  // MoonGlobe shows the YOU ARE HERE beacon + pulse ring on their own claim.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const meRes = await authAPI.getMe();
        if (cancelled || !meRes?.data?.id) return;
        const plotRes = await plotAPI.getMyPlot();
        const p = plotRes?.data?.plot;
        if (!cancelled && p && p.lunar_lat !== undefined && p.lunar_lon !== undefined) {
          setUserPlot({ lunar_lat: p.lunar_lat, lunar_lon: p.lunar_lon });
        }
      } catch (err) {
        // Not logged in or no plot yet — silent, expected for guests.
        if (process.env.NODE_ENV === 'development') {
          console.debug('Returning-user plot fetch skipped:', err?.message);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!formData.birth_date) {
      setBirthMoonPreview(null);
      return () => { cancelled = true; };
    }
    setBirthMoonPreviewLoading(true);
    const timer = setTimeout(async () => {
      try {
        const response = await birthMoonAPI.preview(formData.birth_date);
        if (!cancelled) setBirthMoonPreview(response.data);
      } catch (err) {
        if (!cancelled) setBirthMoonPreview(null);
      } finally {
        if (!cancelled) setBirthMoonPreviewLoading(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [formData.birth_date]);

  const scrollToClaim = (asGift = false) => {
    setGiftMode(asGift);
    setFunnelStep('claim');
    setTimeout(() => {
      claimSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleFreeClaim = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.full_name.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!formData.birth_date) {
      setError('Please enter your birth date to reveal your Birth Moon');
      return;
    }

    setLoading(true);

    try {
      const finalEmail = (formData.email || '').trim().toLowerCase();
      const finalPassword = formData.password || '';
      if (!finalEmail) {
        setError('Please enter a real email address so your account and NFT can be delivered to you.');
        setLoading(false);
        return;
      }
      if (finalPassword.length < 8) {
        setError('Please choose a password with at least 8 characters.');
        setLoading(false);
        return;
      }

      const response = await authAPI.register({
        email: finalEmail,
        password: finalPassword,
        full_name: formData.full_name.trim(),
        birth_date: formData.birth_date,
        country: formData.country || 'Earth',
        message: formData.message || 'A citizen of the Moon',
        referral_code: sessionStorage.getItem('lbp_ref') || undefined,
        is_gift: giftMode,
        gift_occasion: giftMode ? formData.gift_occasion : undefined
      });

      const token = response.data.access_token;
      const user = response.data.user;
      const plot = response.data.plot;

      // Cookie is set by backend; track token in local state for client-side awareness only
      setUserToken(token);
      // Keep the same lightweight routing hint used by /register and /login.
      // Authentication itself remains the httpOnly cookie.
      localStorage.setItem('user', JSON.stringify(user));
      
      const certNum = user?.certificate_number || '';
      const match = certNum.match(/(\d+)$/);
      const citizenNumber = match ? parseInt(match[1], 10) : counter.total_registered + 1;
      
      setClaimResult({
        name: formData.full_name,
        citizenNumber: citizenNumber,
        message: formData.message || 'A citizen of the Moon',
        country: formData.country || 'Earth',
        lunarLat: plot?.lunar_lat || 0,
        lunarLon: plot?.lunar_lon || 0,
        lunarSector: plot?.lunar_sector || user?.lunar_sector || 'Mare Tranquillitatis',
        birthDate: plot?.birth_date || formData.birth_date,
        birthMoonPhase: plot?.birth_moon_phase || birthMoonPreview?.phase_name || '',
        birthMoonIllumination: plot?.birth_moon_illumination ?? birthMoonPreview?.illumination_percent ?? null,
        birthMoonAgeDays: plot?.birth_moon_age_days ?? birthMoonPreview?.lunar_age_days ?? null,
        birthMoonRegion: plot?.birth_moon_region || birthMoonPreview?.birth_moon_region || '',
        loginEmail: finalEmail,
        certificateNumber: user?.certificate_number || ''
      });

      track('claim_completed', {
        citizen_number: citizenNumber,
        country: formData.country || 'Earth',
        has_message: Boolean(formData.message?.trim()),
        certificate_number: user?.certificate_number || '',
        referral_code: sessionStorage.getItem('lbp_ref') || undefined,
        gift_mode: giftMode,
      });

      // Move to result and zoom to user's location
      setFunnelStep('result');
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Tell MoonGlobe to fly to and pulse-mark the user's plot
      if (plot?.lunar_lat !== undefined && plot?.lunar_lon !== undefined) {
        setUserPlot({
          lunar_lat: plot.lunar_lat,
          lunar_lon: plot.lunar_lon,
          owner: formData.full_name,
          citizenNumber,
        });
      }

      loadCounter();
      loadPlots();
      
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Claim error:', error);
      }
      setError(error.response?.data?.detail || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    if (!userToken) {
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      const response = await certificateAPI.createCheckout(window.location.origin);
      window.location.href = response.data.checkout_url;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('Checkout error:', error?.response?.status);
      }
      setError('Unable to start checkout. Please try again.');
      setLoading(false);
    }
  };

  const shareTwitter = () => {
    const text = giftMode
      ? `I just gave someone a symbolic ¼ acre on the Moon 🌙 — complete with their own Birth Moon and Lunar Citizen certificate. Create a lunar gift:`
      : `I just claimed my free symbolic ¼ acre on the Moon! 🌙 I'm Lunar Citizen #${claimResult?.citizenNumber?.toLocaleString()}. Claim yours:`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.origin)}`, '_blank');
  };

  const shareFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin)}`, '_blank');
  };

  const copyLink = () => {
    const shareUrl = `${window.location.origin}?ref=${claimResult?.citizenNumber || ''}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#050510]">
      <style>{`
        @keyframes pulse-user {
          0%, 100% { transform: scale(1); box-shadow: 0 0 20px #22c55e, 0 0 40px #22c55e; }
          50% { transform: scale(1.15); box-shadow: 0 0 30px #22c55e, 0 0 60px #22c55e, 0 0 80px #22c55e; }
        }
        .leaflet-container { 
          background: radial-gradient(ellipse at 40% 30%, #5a5a6a 0%, #3a3a4a 30%, #2a2a3a 50%, #1a1a2e 70%, #0d0d1a 100%) !important; 
        }
        .leaflet-tile-loaded { opacity: 1 !important; }
        .leaflet-popup-content-wrapper { background: transparent !important; box-shadow: none !important; padding: 0 !important; }
        .leaflet-popup-content { margin: 0 !important; width: auto !important; }
        .leaflet-popup-tip { display: none !important; }
        .leaflet-popup-close-button { 
          color: white !important; 
          font-size: 24px !important; 
          width: 30px !important;
          height: 30px !important;
          right: 8px !important;
          top: 8px !important;
          background: rgba(0,0,0,0.5) !important;
          border-radius: 50% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
        .custom-tooltip { background: rgba(0,0,0,0.9) !important; color: white !important; border: 1px solid rgba(96,165,250,0.5) !important; border-radius: 8px !important; padding: 8px 14px !important; font-weight: 600 !important; font-size: 14px !important; }
        .custom-tooltip::before { border-top-color: rgba(0,0,0,0.9) !important; }
        .plot-marker { z-index: 1000 !important; }
      `}</style>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 px-4 py-3 bg-black/50 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="text-white font-bold text-lg">🌙 Luna Birthright</div>
          <div className="flex items-center gap-3">
            <span className="hidden lg:block text-white/60 text-sm">
              {counter.total_registered.toLocaleString()} Citizens • {counter.total_countries} Countries
            </span>
            <button
              onClick={() => navigate('/founding-collection')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-yellow-200 text-sm font-medium hover:text-yellow-100 hover:bg-yellow-400/10 border border-yellow-500/30 transition"
              data-testid="nav-founding-collection"
            >
              <span className="text-yellow-400">★</span> Founding Collection
            </button>
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm font-medium transition"
            >
              Login
            </button>
          </div>
        </div>
      </header>

      {/* ==================== HERO - 3D MOON GLOBE ==================== */}
      {(funnelStep === 'hero' || funnelStep === 'result') && (
        <section className="relative h-screen">
          {/* Full-screen 3D moon globe */}
          <div className="absolute inset-0 z-0">
            <MoonGlobe
              plots={plots}
              userPlot={userPlot}
              autoRotate={funnelStep === 'hero'}
              onMarkerClick={(p) => {
                setSelectedPlot(p || null);
                if (process.env.NODE_ENV === 'development') {
                  console.debug('plot clicked:', p);
                }
              }}
            />
          </div>

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70 pointer-events-none z-[500]"></div>

          {/* Top-left Login link — for returning users */}
          <div className="absolute top-4 left-4 z-[1001]">
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 bg-black/60 hover:bg-black/80 rounded-full text-white backdrop-blur-md border border-white/20 transition text-sm font-medium flex items-center gap-2"
              data-testid="header-login-btn"
              title="Already a citizen? Log in"
            >
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
              Log in
            </button>
          </div>

          {/* Drag-to-rotate hint (hero only) */}
          {funnelStep === 'hero' && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1001] pointer-events-none">
              <p className="text-white/40 text-xs">Drag to rotate • Scroll to zoom</p>
            </div>
          )}

          {/* Hero Content - Overlay on map (compact, top-positioned to leave map visible) */}
          {funnelStep === 'hero' && (
            <div className="absolute inset-x-0 top-20 sm:top-24 flex justify-center z-[1000] pointer-events-none px-4">
              <div className="text-center max-w-md w-full bg-black/55 backdrop-blur-md rounded-2xl px-5 py-4 sm:px-6 sm:py-5 border border-white/15 shadow-xl pointer-events-auto">
                {/* Live counter badge */}
                <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-white/10 rounded-full mb-3 border border-white/15">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                  <span className="text-white/90 text-xs font-medium">
                    {counter.total_registered.toLocaleString()} Citizens • {counter.total_countries} Countries
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 leading-tight">
                  CLAIM YOUR PLACE
                  <span className="text-yellow-400"> ON THE MOON</span>
                  <span className="text-xl sm:text-2xl ml-1">🌙</span>
                </h1>

                <p className="text-xs sm:text-sm text-white/75 mb-4">
                  Each dot is a real Lunar Citizen. Join {counter.total_registered.toLocaleString()}+ from {counter.total_countries} countries.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={() => scrollToClaim(false)}
                    className="px-5 py-2.5 sm:py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white text-sm font-bold rounded-full transition-all transform hover:scale-[1.02] shadow-lg shadow-green-500/30"
                    data-testid="hero-cta"
                  >
                    Claim My Free ¼ Acre
                  </button>
                  <button
                    onClick={() => scrollToClaim(true)}
                    className="px-5 py-2.5 sm:py-3 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black text-sm font-black rounded-full transition-all transform hover:scale-[1.02] shadow-lg shadow-yellow-500/25 flex items-center justify-center gap-1.5"
                    data-testid="hero-gift-cta"
                  >
                    <Gift className="w-4 h-4" /> Gift the Moon
                  </button>
                </div>

                <p className="mt-2 text-white/40 text-[11px]">
                  Personal claims are free • Gift certificate upgrade NZ$12
                </p>
              </div>
            </div>
          )}

          {funnelStep === 'hero' && selectedPlot && (
            <div className="absolute left-4 right-4 sm:left-auto sm:right-5 bottom-16 sm:w-80 z-[1002] bg-black/80 backdrop-blur-xl border border-yellow-500/30 rounded-2xl p-4 shadow-2xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-yellow-300 text-[10px] uppercase tracking-[0.2em]">Selected symbolic plot</p>
                  <p className="text-white font-bold mt-1">{selectedPlot.owner || 'Lunar Citizen'}</p>
                  <p className="text-white/50 text-xs mt-1">{selectedPlot.lunar_sector || 'Lunar Registry'}</p>
                </div>
                <button onClick={() => setSelectedPlot(null)} className="text-white/40 hover:text-white text-lg" aria-label="Close plot details">×</button>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                <div className="bg-white/5 rounded-lg p-2"><span className="text-white/40 block">Latitude</span><strong className="text-white">{Number(selectedPlot.lunar_lat || 0).toFixed(4)}°</strong></div>
                <div className="bg-white/5 rounded-lg p-2"><span className="text-white/40 block">Longitude</span><strong className="text-white">{Number(selectedPlot.lunar_lon || 0).toFixed(4)}°</strong></div>
              </div>
              <p className="text-white/35 text-[10px] mt-2">Symbolic registry location — not legal lunar land ownership.</p>
            </div>
          )}

          {/* Result overlay after claim */}
          {funnelStep === 'result' && claimResult && (
            <div className="absolute top-24 left-1/2 -translate-x-1/2 z-20 w-[calc(100%-2rem)] max-w-md">
              <div className="bg-black/80 backdrop-blur-xl rounded-2xl p-6 border border-green-500/30 shadow-2xl">
                <div className="text-center">
                  <div className="text-3xl mb-2">🎉</div>
                  <h2 className="text-xl font-bold text-white mb-1">
                    {giftMode ? `${claimResult.name}'s lunar gift is ready!` : 'This is your place on the Moon!'}
                  </h2>
                  <p className={`${giftMode ? 'text-yellow-300' : 'text-green-400'} font-semibold`}>
                    {giftMode ? `Lunar Citizen #${claimResult.citizenNumber.toLocaleString()}` : `You are Lunar Citizen #${claimResult.citizenNumber.toLocaleString()}`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Scroll indicator */}
          {funnelStep === 'hero' && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 animate-bounce">
              <ChevronDown className="w-8 h-8 text-white/50" />
            </div>
          )}
        </section>
      )}

      {/* ==================== CLAIM FORM ==================== */}
      {funnelStep === 'claim' && (
        <section ref={claimSectionRef} className="min-h-screen flex items-center justify-center py-20 px-4 bg-gradient-to-b from-[#050510] to-[#0a0a1a]">
          <div className="max-w-md w-full">
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-white/20 shadow-2xl">
              <div className="text-center mb-6">
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 ${giftMode ? 'bg-yellow-500/20' : 'bg-green-500/20'}`}>
                  <Gift className={`w-4 h-4 ${giftMode ? 'text-yellow-300' : 'text-green-400'}`} />
                  <span className={`${giftMode ? 'text-yellow-300' : 'text-green-400'} text-sm font-semibold`}>
                    {giftMode ? 'CREATE A LUNAR GIFT' : '100% FREE CLAIM'}
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                  {giftMode ? 'Gift Someone a Symbolic ¼ Acre of the Moon' : 'Claim Your Free Symbolic Plot'}
                </h2>
                <p className="text-white/60 text-sm">
                  {giftMode
                    ? 'Put their name and birth date on a personalised Lunar Birthright keepsake.'
                    : 'Reserve your symbolic ¼ acre on the Moon'}
                </p>
                <div className="mt-4 inline-flex rounded-xl bg-black/30 border border-white/10 p-1">
                  <button
                    type="button"
                    onClick={() => setGiftMode(false)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold transition ${!giftMode ? 'bg-green-500 text-white' : 'text-white/60 hover:text-white'}`}
                  >
                    For me
                  </button>
                  <button
                    type="button"
                    onClick={() => setGiftMode(true)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold transition ${giftMode ? 'bg-yellow-500 text-black' : 'text-white/60 hover:text-white'}`}
                  >
                    As a gift
                  </button>
                </div>
              </div>

              <form onSubmit={handleFreeClaim} className="space-y-4">
                <div>
                  <label className="block text-white/80 mb-2 text-sm">{giftMode ? "Recipient's Full Name *" : 'Your Full Name *'}</label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    placeholder={giftMode ? "Who is this gift for?" : 'Enter your name'}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-green-500"
                    data-testid="input-name"
                  />
                </div>

                <div>
                  <label className="block text-white/80 mb-2 text-sm">{giftMode ? "Recipient's Birth Date *" : 'Your Birth Date *'}</label>
                  <input
                    type="date"
                    value={formData.birth_date}
                    onChange={(e) => setFormData({...formData, birth_date: e.target.value})}
                    max={new Date().toISOString().split('T')[0]}
                    required
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-cyan-400"
                    data-testid="input-birth-date"
                  />
                  <p className="text-white/40 text-xs mt-1">
                    {giftMode
                      ? "Their birth date is used to calculate the approximate Birth Moon and symbolic region. The raw date is not shown on the public registry."
                      : 'We use your date to calculate your approximate lunar phase and reveal a symbolic Birth Moon region.'}
                  </p>
                </div>

                {birthMoonPreviewLoading && (
                  <div className="p-4 rounded-xl border border-cyan-400/20 bg-cyan-400/5 text-cyan-100 text-sm flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Revealing your Birth Moon…
                  </div>
                )}

                {birthMoonPreview && !birthMoonPreviewLoading && (
                  <div className="overflow-hidden rounded-2xl border border-cyan-400/30 bg-gradient-to-br from-cyan-500/10 to-indigo-500/10" data-testid="birth-moon-preview">
                    <div className="h-56 bg-black/30">
                      <MoonGlobe
                        plots={[]}
                        focusPlot={{ lunar_lat: birthMoonPreview.lunar_lat, lunar_lon: birthMoonPreview.lunar_lon }}
                        autoRotate={false}
                      />
                    </div>
                    <div className="p-4">
                      <p className="text-cyan-300 text-xs uppercase tracking-[0.2em] mb-1">{giftMode ? "Their Birth Moon" : 'Your Birth Moon'}</p>
                      <div className="flex items-center justify-between gap-3">
                        <strong className="text-white">{birthMoonPreview.phase_name}</strong>
                        <span className="text-yellow-300 font-semibold">{birthMoonPreview.illumination_percent}% illuminated</span>
                      </div>
                      <p className="text-white/70 text-sm mt-1">{birthMoonPreview.birth_moon_region} • lunar age {birthMoonPreview.lunar_age_days} days</p>
                      <p className="text-white/40 text-[11px] mt-2">The phase is astronomical approximation; the highlighted surface region is a symbolic phase-linked registry location.</p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-white/80 mb-2 text-sm">
                    {giftMode ? 'Your Email' : 'Your Email'} <span className="text-white/40 text-xs">{giftMode ? '(you manage/download the gift)' : '(required for your account and NFT delivery)'}</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder={giftMode ? 'Purchaser email' : 'you@example.com'}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-green-500"
                    data-testid="input-email"
                    required
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label className="block text-white/80 mb-2 text-sm">
                    {giftMode ? 'Create Your Gift Manager Password' : 'Choose a Password'} <span className="text-white/40 text-xs">(required)</span>
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    placeholder="At least 8 characters"
                    minLength={8}
                    required
                    autoComplete="new-password"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-green-500"
                    data-testid="input-password"
                  />
                  <p className="text-white/40 text-xs mt-1">
                    {giftMode
                      ? 'You manage this gift from your account. Use a unique password you do not use on another site.'
                      : 'Use a unique password you do not use on another site.'}
                  </p>
                </div>

                <div>
                  <label className="block text-white/80 mb-2 text-sm">{giftMode ? "Recipient's Country (Optional)" : 'Country (Optional)'}</label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({...formData, country: e.target.value})}
                    placeholder={giftMode ? 'Where are they from?' : 'Where are you from?'}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-green-500"
                    data-testid="input-country"
                  />
                </div>

                {giftMode && (
                  <div>
                    <label className="block text-white/80 mb-2 text-sm">Gift Occasion</label>
                    <select
                      value={formData.gift_occasion}
                      onChange={(e) => setFormData({...formData, gift_occasion: e.target.value})}
                      className="w-full px-4 py-3 bg-[#15151c] border border-white/20 rounded-xl text-white focus:outline-none focus:border-yellow-400"
                      data-testid="input-gift-occasion"
                    >
                      {['Birthday', 'Christmas', 'Anniversary', 'Wedding', 'New baby', "Mother's Day", "Father's Day", 'Valentine’s Day', 'Memorial keepsake', 'Just because'].map((occasion) => (
                        <option key={occasion} value={occasion}>{occasion}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-white/80 mb-2 text-sm">{giftMode ? 'Personal Gift Message (Optional)' : 'Message to the Future (Optional)'}</label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    placeholder={giftMode ? 'Happy birthday — your place among the stars is waiting…' : 'Leave a message...'}
                    rows={2}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-green-500 resize-none"
                    data-testid="input-message"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300 text-center text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full px-6 py-4 disabled:opacity-50 text-lg font-bold rounded-xl transition flex items-center justify-center gap-2 ${
                    giftMode
                      ? 'bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black shadow-lg shadow-yellow-500/20'
                      : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white'
                  }`}
                  data-testid="claim-btn"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <MapPin className="w-5 h-5" />}
                  {loading ? 'Creating...' : giftMode ? 'Create Their Free Symbolic Plot' : 'Claim My Place — FREE'}
                </button>

                <p className="text-center text-white/40 text-xs">
                  {giftMode ? 'Plot creation is free • Personalised gift certificate upgrade NZ$12' : 'No credit card required'}
                </p>
              </form>

              <button onClick={() => setFunnelStep('hero')} className="w-full mt-4 text-white/50 hover:text-white/70 text-sm">
                ← Back to map
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ==================== GIFT THE MOON ==================== */}
      {funnelStep !== 'claim' && (
        <section className="py-16 px-4 bg-[#07070d] border-y border-yellow-500/10" data-testid="gift-the-moon-section">
          <div className="max-w-5xl mx-auto">
            <div className="grid lg:grid-cols-[1.05fr_.95fr] gap-8 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/25 mb-4">
                  <Gift className="w-4 h-4 text-yellow-300" />
                  <span className="text-yellow-300 text-xs font-bold uppercase tracking-[0.18em]">Gift the Moon</span>
                </div>
                <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight mb-4">
                  Give them something they will <span className="text-yellow-400">never expect.</span>
                </h2>
                <p className="text-white/65 text-base sm:text-lg leading-relaxed max-w-2xl">
                  Put their name and birth date into Lunar Birthright, reveal the Moon phase from their birthday, reserve a symbolic quarter-acre lunar plot, and create a personalised certificate they can keep, frame and share.
                </p>

                <div className="flex flex-wrap gap-2 mt-5">
                  {['Birthdays', 'Christmas', 'Anniversaries', 'Weddings', 'New baby', 'Mother’s Day', 'Father’s Day', 'Memorial keepsakes'].map((occasion) => (
                    <span key={occasion} className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/70 text-xs">
                      {occasion}
                    </span>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mt-7">
                  <button
                    onClick={() => scrollToClaim(true)}
                    className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 text-black font-black hover:from-yellow-400 hover:to-amber-400 transition shadow-lg shadow-yellow-500/20 flex items-center justify-center gap-2"
                    data-testid="gift-section-cta"
                  >
                    <Gift className="w-5 h-5" /> Create a Lunar Gift
                  </button>
                  <button
                    onClick={() => navigate('/founding-collection')}
                    className="px-6 py-3.5 rounded-xl border border-white/15 bg-white/5 text-white font-semibold hover:bg-white/10 transition"
                  >
                    See the Certificate
                  </button>
                </div>
                <p className="text-white/35 text-[11px] mt-3">
                  Symbolic registry keepsake only. It does not grant legal ownership of lunar real estate.
                </p>
              </div>

              <div className="relative overflow-hidden rounded-3xl border border-yellow-500/25 bg-gradient-to-br from-yellow-500/10 via-white/[0.03] to-cyan-500/5 p-6 shadow-2xl">
                <div className="absolute -top-20 -right-20 w-52 h-52 rounded-full bg-yellow-400/10 blur-3xl"></div>
                <p className="text-yellow-300 text-xs uppercase tracking-[0.2em] mb-3">The gift experience</p>
                <div className="space-y-3 relative z-10">
                  {[
                    ['01', 'Their name', 'Personalised to the person receiving the gift.'],
                    ['02', 'Their birth date', 'Reveals an approximate Birth Moon phase, illumination and symbolic lunar region.'],
                    ['03', 'Their symbolic ¼ acre', 'A plotted location appears on the interactive Moon registry.'],
                    ['04', 'Your message', 'Add a birthday, love, family or memorial dedication.'],
                    ['05', 'Premium certificate', 'NZ$12 upgrade for a printable keepsake plus the digital collectible path.'],
                  ].map(([num, title, copy]) => (
                    <div key={num} className="flex gap-4 p-3 rounded-2xl bg-black/25 border border-white/10">
                      <div className="w-9 h-9 rounded-full border border-yellow-500/40 text-yellow-300 flex items-center justify-center text-xs font-black flex-shrink-0">{num}</div>
                      <div>
                        <h3 className="text-white font-bold">{title}</h3>
                        <p className="text-white/50 text-xs leading-relaxed mt-1">{copy}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ==================== ORIGINAL FOUNDING CERTIFICATE (SEO featured) ==================== */}
      <section
        id="original-founding-certificate"
        className="py-16 px-4 bg-gradient-to-b from-[#050510] via-[#080820] to-[#050510]"
        data-testid="homepage-founding-cert-section"
      >
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-500/15 border border-yellow-500/30 rounded-full mb-4">
            <span className="text-yellow-300 text-xs font-semibold tracking-widest uppercase">Featured</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            The <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">Original Founding Citizen Certificate</span>
          </h2>
          <p className="text-white/60 max-w-xl mx-auto mb-10">
            Issued to Lunar Citizen No. 000001 — the first symbolic quarter acre of the Moon,
            permanently recorded in the Lunar Birthright Project archive.
          </p>
          <OriginalFoundingCertificate variant="featured" />
        </div>
      </section>

      {/* ==================== RESULT + UPGRADE ==================== */}
      {funnelStep === 'result' && claimResult && (
        <section className="py-8 px-4 bg-gradient-to-b from-transparent to-[#0a0a1a]">
          <div className="max-w-lg mx-auto space-y-6">
            {/* Claim Details */}
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
              <div className="text-center mb-4">
                <p className="text-white/60 text-xs uppercase tracking-wider mb-1">{giftMode ? 'Gift Recipient' : 'Your Lunar Identity'}</p>
                <h2 className="text-2xl font-bold text-white">{claimResult.name}</h2>
                <p className="text-xl text-yellow-400 font-bold">Citizen #{claimResult.citizenNumber.toLocaleString()}</p>
              </div>
              <div className="text-sm space-y-2 py-4 border-y border-white/10">
                <div className="flex justify-between gap-3"><span className="text-white/60">Birth Moon</span><span className="text-cyan-200 text-right">{claimResult.birthMoonPhase}</span></div>
                <div className="flex justify-between gap-3"><span className="text-white/60">Illumination</span><span className="text-yellow-200">{claimResult.birthMoonIllumination}%</span></div>
                <div className="flex justify-between gap-3"><span className="text-white/60">Birth Region</span><span className="text-white text-right">{claimResult.birthMoonRegion}</span></div>
                <div className="flex justify-between gap-3"><span className="text-white/60">Location</span><span className="text-white text-right">{claimResult.lunarSector}</span></div>
                <div className="flex justify-between"><span className="text-white/60">Country</span><span className="text-white">{claimResult.country}</span></div>
              </div>
              {claimResult.message && (
                <p className="text-white/70 italic text-sm mt-4">"{claimResult.message}"</p>
              )}
              <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-center">
                <p className="text-blue-300 text-sm">✨ Recorded in the Lunar Registry</p>
              </div>
            </div>

            {/* Account confirmation — never re-display or copy the password. */}
            <div className="bg-gradient-to-br from-amber-900/30 to-yellow-900/20 rounded-2xl p-5 border border-amber-500/40 backdrop-blur-sm" data-testid="account-confirmation-panel">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🔐</span>
                <div>
                  <h3 className="text-amber-300 font-bold">{giftMode ? 'Your gift manager account is secured' : 'Your account is secured'}</h3>
                  <p className="text-amber-200/70 text-xs">
                    {giftMode
                      ? <>You can manage and download this gift by signing in with <strong>{claimResult.loginEmail}</strong> and the password you just chose. We never display your password back to you.</>
                      : <>Sign in later with <strong>{claimResult.loginEmail}</strong> and the password you just chose. We never display your password back to you.</>}
                  </p>
                </div>
              </div>
            </div>

            {/* Share - Enhanced Cool Design */}
            <div className="bg-gradient-to-br from-purple-900/40 to-blue-900/40 rounded-2xl p-5 border border-purple-500/30 backdrop-blur-sm relative overflow-hidden">
              {/* Animated background glow */}
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl animate-pulse" style={{animationDelay: '1s'}}></div>
              
              <div className="relative z-10">
                <div className="text-center mb-4">
                  <span className="text-2xl">🚀</span>
                  <h4 className="text-lg font-bold text-white mt-1">{giftMode ? 'Share the Lunar Gift Idea!' : 'Share Your Lunar Claim!'}</h4>
                  <p className="text-white/60 text-xs">{giftMode ? 'Inspire someone else to give a piece of the Moon' : "Let the world know you're a Moon citizen"}</p>
                </div>
                
                {/* Share buttons with hover animations */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <button 
                    onClick={shareTwitter} 
                    className="group relative px-3 py-3 bg-gradient-to-br from-[#1DA1F2] to-[#0d8bd9] rounded-xl text-white font-medium flex flex-col items-center gap-1 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-[#1DA1F2]/30"
                  >
                    <Twitter className="w-5 h-5 group-hover:animate-bounce" />
                    <span className="text-xs">Tweet</span>
                  </button>
                  <button 
                    onClick={shareFacebook} 
                    className="group relative px-3 py-3 bg-gradient-to-br from-[#4267B2] to-[#2d4a8a] rounded-xl text-white font-medium flex flex-col items-center gap-1 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-[#4267B2]/30"
                  >
                    <Facebook className="w-5 h-5 group-hover:animate-bounce" />
                    <span className="text-xs">Share</span>
                  </button>
                  <button 
                    onClick={copyLink} 
                    className="group relative px-3 py-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl text-white font-medium flex flex-col items-center gap-1 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-emerald-500/30"
                  >
                    {copied ? <Check className="w-5 h-5 text-white" /> : <Copy className="w-5 h-5 group-hover:animate-bounce" />}
                    <span className="text-xs">{copied ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                </div>
                
                {/* Save to Home Screen / PWA prompt */}
                <div className="bg-black/30 rounded-xl p-3 border border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                      <span className="text-2xl">🌙</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-semibold text-sm">Save to Home Screen</p>
                      <p className="text-white/50 text-xs">Quick access to your lunar dashboard</p>
                    </div>
                    <button 
                      onClick={() => {
                        if (navigator.share) {
                          navigator.share({
                            title: 'Luna Birthright',
                            text: `I'm Lunar Citizen #${claimResult?.citizenNumber?.toLocaleString()}! 🌙`,
                            url: window.location.origin
                          });
                        } else {
                          alert('Tap the browser menu and select "Add to Home Screen" to save!');
                        }
                      }}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-xs font-semibold transition-all hover:scale-105"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Upgrade Offer */}
            <div className="bg-gradient-to-br from-yellow-900/30 to-orange-900/30 rounded-2xl p-6 border-2 border-yellow-500/30">
              <div className="text-center mb-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-500/20 rounded-full mb-3">
                  <Star className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-300 text-xs font-semibold">MAKE IT OFFICIAL</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">{giftMode ? 'Create Their Personalised Gift Certificate' : 'Get Your Certificate'}</h3>
                <div className="text-4xl font-black text-white">NZ$12</div>
                <p className="text-white/60 text-sm">One-time payment</p>
              </div>

              <div className="space-y-2 mb-6 text-sm">
                {(giftMode
                  ? ['🎁 Personalised certificate in their name', '🌙 Their Birth Moon + symbolic lunar plot', '🎨 Polygon NFT delivered to your gift-manager account']
                  : ['📜 Premium PDF certificate', '⭐ Founding Citizen status', '🎨 Blockchain NFT Certificate']
                ).map((item) => (
                  <div key={item} className="flex items-center gap-2 text-white/80">{item}</div>
                ))}
              </div>

              <button
                onClick={handleUpgrade}
                disabled={loading}
                className="w-full px-6 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 disabled:opacity-50 text-black text-lg font-bold rounded-xl transition flex items-center justify-center gap-2"
                data-testid="upgrade-btn"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Award className="w-5 h-5" />}
                {giftMode ? 'Get Gift Certificate — NZ$12' : 'Get Certificate'}
              </button>

              <button onClick={() => navigate('/dashboard')} className="w-full mt-3 text-white/40 hover:text-white/60 text-sm">
                Skip → Dashboard
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="py-6 bg-[#030308] border-t border-white/10">
        <div className="max-w-4xl mx-auto px-4 text-center text-white/40 text-xs">
          <p>Luna Birthright Project © 2026 • Moon imagery © NASA/LROC</p>
        </div>
      </footer>
    </div>
  );
};

export default LunaLandingPage;
