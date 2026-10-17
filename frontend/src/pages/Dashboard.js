import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  authAPI,
  plotAPI,
  certificateAPI,
  referralAPI,
  shareCardAPI,
} from '@/utils/api';
import {
  MapPin, Calendar, Award, Loader2, CheckCircle, Download,
  Image as ImageIcon, Star, Link as LinkIcon, Shield, Moon, Sparkles,
} from 'lucide-react';
import MoonMap from '@/components/MoonMap';
import DashboardNav from '@/components/dashboard/DashboardNav';
import SuccessCelebration from '@/components/dashboard/SuccessCelebration';
import ReferralSection from '@/components/dashboard/ReferralSection';
import { track } from '@/utils/analytics';

const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

const Dashboard = ({ setIsAuthenticated }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [plot, setPlot] = useState(null);
  const [certificate, setCertificate] = useState(null);
  const [nftStatus, setNftStatus] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [downloadingCard, setDownloadingCard] = useState(false);
  const [referralStats, setReferralStats] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const meResponse = await authAPI.getMe();
      setUser(meResponse.data);
      setIsAdmin(meResponse.data.is_admin === true);
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('Auth check failed, redirecting to /login:', err?.response?.status);
      }
      navigate('/login');
      return;
    }

    // Plot — may legitimately not exist for very old / partial accounts; silently skip
    try {
      const plotResponse = await plotAPI.getMyPlot();
      setPlot(plotResponse.data.plot);
    } catch (err) {
      // No plot is a valid state (e.g. legacy admin) — non-blocking
      if (process.env.NODE_ENV === 'development') {
        console.debug('Plot load skipped:', err?.response?.status);
      }
    }

    try {
      const statsResponse = await plotAPI.getStats();
      setStats(statsResponse.data);
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('Stats load failed:', err?.response?.status);
      }
    }

    try {
      const certResponse = await certificateAPI.getMyCertificate();
      // Backend returns 200+null when there's no certificate (free user) — only
      // load NFT status if we actually have a certificate.
      setCertificate(certResponse.data);
      if (certResponse.data) {
        try {
          const nftResponse = await certificateAPI.getNftStatus();
          setNftStatus(nftResponse.data);
        } catch (err) {
          if (process.env.NODE_ENV === 'development') {
            console.debug('NFT status not available:', err?.response?.status);
          }
        }
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('Certificate load failed:', err?.response?.status);
      }
    }

    try {
      const referralResponse = await referralAPI.getMyStats();
      setReferralStats(referralResponse.data);
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('Referral stats unavailable:', err?.response?.status);
      }
    }

    setLoading(false);
  }, [navigate]);

  const pollPaymentStatus = useCallback(async (sessionId, attempts = 0) => {
    const maxAttempts = 5;
    if (attempts >= maxAttempts) {
      alert('Payment check timed out. Please refresh the page.');
      return;
    }
    setCheckingPayment(true);
    try {
      const response = await certificateAPI.getStatus(sessionId);
      if (response.data.payment_status === 'paid') {
        await loadData();
        setShowSuccess(true);
        navigate('/dashboard?certificate=success', { replace: true });
        return;
      }
      if (response.data.status === 'expired') {
        alert('Payment session expired. Please try again.');
        return;
      }
      setTimeout(() => pollPaymentStatus(sessionId, attempts + 1), 2000);
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Payment status check failed:', err);
      }
      alert('Error verifying payment. Please contact support if charged.');
    } finally {
      setCheckingPayment(false);
    }
  }, [loadData, navigate]);

  useEffect(() => {
    loadData();
    const certificateSuccess = searchParams.get('certificate');
    const sessionId = searchParams.get('session_id');
    if (certificateSuccess === 'success' || sessionId) {
      setShowSuccess(true);
      if (sessionId) pollPaymentStatus(sessionId);
    }
  }, [loadData, pollPaymentStatus, searchParams]);

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (err) {
      // Still proceed with client cleanup even if server-side logout fails
      if (process.env.NODE_ENV === 'development') {
        console.debug('Logout API failed (continuing with client cleanup):', err?.response?.status);
      }
    }
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    navigate('/');
  };

  const handleDownloadShareCard = async () => {
    setDownloadingCard(true);
    try {
      const response = await shareCardAPI.generate();
      const certNum = user?.certificate_number || '';
      const match = certNum.match(/(\d+)$/);
      const num = match ? parseInt(match[1], 10) : 'card';
      downloadBlob(new Blob([response.data]), `luna-share-card-${num}.png`);
      track('certificate_downloaded', {
        format: 'share-card',
        certificate_number: certNum,
      });
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Share card generation failed:', err);
      }
      alert('Error generating share card. Please try again.');
    } finally {
      setDownloadingCard(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await certificateAPI.downloadPdf();
      downloadBlob(
        new Blob([response.data], { type: 'application/pdf' }),
        `Luna-Certificate-${user?.certificate_number || 'certificate'}.pdf`
      );
      track('certificate_downloaded', {
        format: 'pdf',
        certificate_number: user?.certificate_number || '',
      });
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('PDF download failed:', err);
      }
      alert('Error downloading certificate. Please try again.');
    }
  };

  if (loading || checkingPayment) {
    return (
      <div className="min-h-screen stars-bg flex items-center justify-center flex-col">
        <Loader2 className="w-12 h-12 text-blue-400 animate-spin mb-4" />
        {checkingPayment && <p className="text-white">Verifying your payment...</p>}
      </div>
    );
  }

  const isPaid = certificate && (certificate.payment_status === 'paid' || certificate.payment_status === 'granted');

  return (
    <div className="min-h-screen stars-bg text-white">
      <DashboardNav
        isAdmin={isAdmin}
        onAdminClick={() => navigate('/admin')}
        onLearnClick={() => navigate('/learn')}
        onLogout={handleLogout}
      />

      <div className="container mx-auto px-6 py-12">
        {/* Welcome Section */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2" data-testid="dashboard-welcome">
            {user?.is_gift ? `Lunar Gift for ${user?.full_name}` : `Welcome, ${user?.full_name}!`}
          </h1>
          <p className="text-gray-300" data-testid="dashboard-subtitle">
            {user?.is_gift
              ? `You are managing this ${user?.gift_occasion ? user.gift_occasion.toLowerCase() + ' ' : ''}gift and its symbolic lunar registry record.`
              : 'Your symbolic place on the Moon awaits'}
          </p>
        </div>

        {user?.is_gift && (
          <div className="mb-8 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-5" data-testid="gift-manager-banner">
            <p className="text-yellow-300 text-xs uppercase tracking-[0.18em] font-semibold mb-1">Gift Manager</p>
            <p className="text-white font-semibold">This account manages the Lunar Birthright gift created for {user.full_name}.</p>
            <p className="text-gray-400 text-sm mt-1">The recipient's raw birth date is used for Birth Moon calculation but is not displayed in the public registry.</p>
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-gray-900/50 backdrop-blur-sm p-6 rounded-xl" data-testid="stats-card-total">
              <h3 className="text-gray-400 text-sm mb-2">Symbolic Plots Available</h3>
              <p className="text-3xl font-bold">{stats.total_plots.toLocaleString()}</p>
            </div>
            <div className="bg-gray-900/50 backdrop-blur-sm p-6 rounded-xl" data-testid="stats-card-claimed">
              <h3 className="text-gray-400 text-sm mb-2">Symbolic Plots Claimed</h3>
              <p className="text-3xl font-bold text-blue-400">{stats.claimed_plots.toLocaleString()}</p>
            </div>
            <div className="bg-gray-900/50 backdrop-blur-sm p-6 rounded-xl" data-testid="stats-card-available">
              <h3 className="text-gray-400 text-sm mb-2">Still Available</h3>
              <p className="text-3xl font-bold text-green-400">{stats.available_plots.toLocaleString()}</p>
            </div>
          </div>
        )}

        {/* Birth Moon identity — available for V3 claims and migrated legacy citizens */}
        {plot?.birth_moon_phase && (
          <div
            className="mb-8 bg-gradient-to-br from-indigo-950/70 via-purple-950/60 to-gray-900/70 border border-purple-400/20 backdrop-blur-sm p-8 rounded-xl"
            data-testid="birth-moon-card"
          >
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                  <Moon className="w-8 h-8 text-purple-200" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-purple-300 mb-1">Your Birth Moon</p>
                  <h2 className="text-3xl font-bold mb-2">{plot.birth_moon_phase}</h2>
                  <p className="text-gray-300 max-w-2xl">
                    Your birth date is linked to this approximate lunar phase and symbolic Moon region.
                    {plot.legacy_plot_preserved && ' Your original Lunar Birthright plot has been preserved exactly as claimed.'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 lg:min-w-[430px]">
                <div className="bg-black/25 rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-1">Illumination</p>
                  <p className="text-xl font-semibold">{Number(plot.birth_moon_illumination).toFixed(1)}%</p>
                </div>
                <div className="bg-black/25 rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-1">Lunar Age</p>
                  <p className="text-xl font-semibold">{Number(plot.birth_moon_age_days).toFixed(1)} days</p>
                </div>
                <div className="bg-black/25 rounded-lg p-4 col-span-2 sm:col-span-1">
                  <p className="text-xs text-gray-400 mb-1">Symbolic Region</p>
                  <p className="text-base font-semibold">{plot.birth_moon_region}</p>
                </div>
              </div>
            </div>
            <div className="mt-5 flex items-start gap-2 text-xs text-gray-400">
              <Sparkles className="w-4 h-4 mt-0.5 text-purple-300 shrink-0" />
              <p>Birth Moon phase is an astronomical approximation; the linked surface region and quarter-acre registry location are symbolic and do not represent legal ownership of lunar land.</p>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        {plot && (
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="bg-gray-900/50 backdrop-blur-sm p-8 rounded-xl" data-testid="plot-details-card">
              <h2 className="text-2xl font-bold mb-6 flex items-center">
                <MapPin className="w-6 h-6 mr-2 text-blue-400" />
                {user?.is_gift ? `${user.full_name}'s Symbolic Lunar Plot` : 'Your Symbolic Lunar Plot'}
              </h2>
              <div className="space-y-4">
                <div>
                  <p className="text-gray-400 text-sm">Plot ID</p>
                  <p className="text-lg font-mono" data-testid="plot-id">{plot.id}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Coordinates</p>
                  <p className="text-lg" data-testid="plot-coordinates">
                    Latitude: {plot.lunar_lat.toFixed(6)}°<br />
                    Longitude: {plot.lunar_lon.toFixed(6)}°
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Area</p>
                  <p className="text-lg" data-testid="plot-area">{plot.area_sqm.toFixed(0)} m² (0.25 acres)</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    Claimed On
                  </p>
                  <p className="text-lg" data-testid="plot-claimed-date">
                    {new Date(plot.claimed_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-900/50 backdrop-blur-sm p-8 rounded-xl" data-testid="moon-map-card">
              <h2 className="text-2xl font-bold mb-6">Your Symbolic Plot Location</h2>
              <MoonMap latitude={plot.lunar_lat} longitude={plot.lunar_lon} />
            </div>
          </div>
        )}

        {/* Success Celebration Banner */}
        {showSuccess && isPaid && (
          <SuccessCelebration
            user={user}
            onDownloadPdf={handleDownloadPDF}
            onDownloadShareCard={handleDownloadShareCard}
            downloadingCard={downloadingCard}
            onDismiss={() => setShowSuccess(false)}
          />
        )}

        {/* Certificate Section */}
        <div className="mt-8 bg-gradient-to-r from-blue-900/30 to-purple-900/30 backdrop-blur-sm p-8 rounded-xl" data-testid="certificate-section">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-3 flex items-center">
                <Award className="w-6 h-6 mr-2 text-yellow-400" />
                Founding Lunar Citizen Status
              </h2>
              {isPaid ? (
                <div data-testid="certificate-purchased">
                  <div className="flex items-center gap-2 mb-4">
                    <Star className="w-5 h-5 text-yellow-400" />
                    <p className="text-yellow-400 font-semibold">Founding Lunar Citizen</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-gray-900/50 p-4 rounded-lg border border-yellow-500/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Award className="w-5 h-5 text-yellow-400" />
                        <span className="text-sm text-gray-400">Official Certificate</span>
                      </div>
                      <p className="text-white font-mono text-sm mb-3">{user?.certificate_number}</p>
                      <button
                        onClick={() => navigate('/certificate')}
                        className="w-full px-4 py-2 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 rounded-lg text-sm font-semibold transition flex items-center justify-center"
                        data-testid="view-certificate-btn"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download PDF
                      </button>
                    </div>

                    <div className="bg-gray-900/50 p-4 rounded-lg border border-purple-500/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-5 h-5 text-purple-400" />
                        <span className="text-sm text-gray-400">Blockchain NFT</span>
                      </div>
                      {nftStatus?.nft_minted && nftStatus?.nft_status === 'success' ? (
                        <>
                          <p className="text-purple-300 text-sm mb-1">Token: {nftStatus.nft_token_id}</p>
                          <p className="text-xs text-gray-500 mb-3">
                            Chain: {nftStatus.nft_chain === 'polygon' ? 'Polygon' : 'Polygon Amoy'}
                          </p>
                          {nftStatus.opensea_url ? (
                            <a
                              href={nftStatus.opensea_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-semibold transition flex items-center justify-center"
                              data-testid="view-nft-btn"
                            >
                              <LinkIcon className="w-4 h-4 mr-2" />
                              View on OpenSea
                            </a>
                          ) : (
                            <div className="w-full px-4 py-2 bg-purple-900/50 rounded-lg text-sm text-center text-purple-300">✓ On-chain mint confirmed</div>
                          )}
                        </>
                      ) : nftStatus?.nft_status === 'pending' || nftStatus?.nft_status === 'processing' ? (
                        <>
                          <p className="text-purple-300 text-sm mb-3">Your NFT mint has been submitted to Polygon and is awaiting confirmation.</p>
                          <div className="w-full px-4 py-2 bg-purple-900/30 rounded-lg text-sm text-center text-purple-200">Blockchain confirmation pending</div>
                        </>
                      ) : nftStatus?.nft_status === 'failed' || nftStatus?.nft_status === 'not_configured' ? (
                        <>
                          <p className="text-amber-300 text-sm mb-3">Your paid certificate is safe, but the NFT still needs to be minted.</p>
                          <div className="w-full px-4 py-2 bg-amber-900/30 rounded-lg text-sm text-center text-amber-200">NFT mint requires retry</div>
                        </>
                      ) : (
                        <>
                          <p className="text-gray-400 text-sm mb-3">NFT is included with the Founding upgrade.</p>
                          <div className="w-full px-4 py-2 bg-gray-800 rounded-lg text-sm text-center text-gray-500">Not minted yet</div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mb-6">
                    <div className="bg-gray-900/50 p-4 rounded-lg border border-blue-500/30">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <ImageIcon className="w-5 h-5 text-blue-400" />
                            <span className="text-sm text-gray-400">Share Card</span>
                          </div>
                          <p className="text-blue-300 text-sm">Social media ready image</p>
                        </div>
                        <button
                          onClick={handleDownloadShareCard}
                          disabled={downloadingCard}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-semibold transition flex items-center disabled:opacity-50"
                          data-testid="download-share-card-section-btn"
                        >
                          {downloadingCard ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4 mr-2" />
                          )}
                          {downloadingCard ? 'Generating...' : 'Download'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-gray-400">
                    {certificate.payment_status === 'granted'
                      ? 'Certificate granted by admin'
                      : `Secured on: ${new Date(certificate.purchased_at).toLocaleDateString()}`}
                  </p>
                </div>
              ) : (
                <div data-testid="certificate-not-purchased">
                  <p className="text-gray-300 mb-4">
                    Become a recognised Founding Lunar Citizen and receive everything included:
                  </p>

                  <div className="grid grid-cols-2 gap-2 mb-6 text-sm">
                    <div className="flex items-center gap-2 text-gray-400">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      Official Certificate (PDF)
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      Blockchain NFT
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      Founding Recognition
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      Permanent Registry
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-3xl font-bold text-yellow-400">NZ$12</p>
                    <p className="text-sm text-gray-400">Everything included • One-time payment</p>
                  </div>
                  <button
                    onClick={() => navigate('/upgrade')}
                    className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 rounded-lg font-bold transition flex items-center text-black"
                    data-testid="purchase-certificate-btn"
                  >
                    <Star className="w-5 h-5 mr-2" />
                    Become a Founding Lunar Citizen
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <ReferralSection referralStats={referralStats} hasCertificate={isPaid} />
      </div>
    </div>
  );
};

export default Dashboard;
