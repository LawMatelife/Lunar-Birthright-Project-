import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI, certificateAPI, referralAPI, registryAPI } from '@/utils/api';
import LiveCitizensTicker from '@/components/LiveCitizensTicker';
import OriginalFoundingCertificate from '@/components/OriginalFoundingCertificate';
import { 
  Award, Shield, Download, CheckCircle, Globe, 
  Loader2, Clock, Users, MessageCircle,
  Star, Zap, Lock, Gift
} from 'lucide-react';

const UpgradePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [globalStats, setGlobalStats] = useState({ total_registered: 0 });
  const [citizenNumber, setCitizenNumber] = useState(0);
  const [discountStatus, setDiscountStatus] = useState(null);

  const loadUserData = useCallback(async () => {
    try {
      const response = await authAPI.getMe();
      setUser(response.data);

      const certNumber = response.data?.certificate_number || '';
      const match = certNumber.match(/(\d+)$/);
      setCitizenNumber(match ? parseInt(match[1], 10) : Math.floor(Math.random() * 50000) + 1);

      // Load referral discount status
      try {
        const discountResponse = await referralAPI.getDiscountStatus();
        setDiscountStatus(discountResponse.data);
      } catch (discountErr) {
        // Non-critical
        if (process.env.NODE_ENV === 'development') {
          console.debug('Discount status unavailable:', discountErr?.response?.status);
        }
      }
    } catch (error) {
      navigate('/login');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const loadGlobalStats = useCallback(async () => {
    try {
      const response = await registryAPI.getCounter();
      setGlobalStats(response.data);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('Stats loading failed:', error?.response?.status || error.message);
      }
    }
  }, []);

  useEffect(() => {
    loadUserData();
    loadGlobalStats();
  }, [loadUserData, loadGlobalStats]);

  const handleUpgrade = async () => {
    setPurchasing(true);
    try {
      const origin_url = window.location.origin;
      const response = await certificateAPI.createCheckout(origin_url);

      if (response.data.checkout_url) {
        window.location.href = response.data.checkout_url;
      } else {
        alert('Failed to create checkout session. Please try again.');
      }
    } catch (error) {
      const errorMsg = error.response?.data?.detail || error.message || 'Unknown error';
      alert(`Error: ${errorMsg}`);
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050510] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />
      </div>
    );
  }

  const spotsRemaining = Math.max(1000000 - globalStats.total_registered, 0);
  const percentFilled = ((globalStats.total_registered / 1000000) * 100).toFixed(2);

  return (
    <div className="min-h-screen bg-[#050510]">
      {/* Hero Section */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <div className="absolute inset-0 stars-bg"></div>
        <div className="absolute top-10 right-10 w-32 h-32 rounded-full bg-gradient-to-br from-yellow-200 to-yellow-400 opacity-10 blur-xl"></div>
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            {/* Identity Card */}
            <div className="mb-8 p-6 bg-gradient-to-br from-blue-900/40 to-purple-900/40 border border-blue-500/30 rounded-2xl inline-block">
              <p className="text-blue-300 text-sm uppercase tracking-wider mb-1">You Are</p>
              <h1 className="text-4xl md:text-5xl font-black text-white mb-1" data-testid="upgrade-citizen-number">
                Lunar Citizen #{citizenNumber.toLocaleString()}
              </h1>
              <p className="text-xl text-blue-200">{user?.full_name}</p>
            </div>

            {/* Main Headline */}
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4" data-testid="upgrade-title">
              Become a <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">Founding Lunar Citizen</span>
            </h2>
            
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Secure your place in history as part of the first generation supporting humanity's future in space.
            </p>

            {/* Urgency Banner */}
            <div className="mb-8 p-4 bg-red-900/30 border border-red-500/30 rounded-xl">
              <p className="text-red-300 font-semibold">
                ⚠️ Only <span className="text-white">{spotsRemaining.toLocaleString()}</span> Founding Generation spots remaining
              </p>
              <p className="text-red-400/70 text-sm mt-1">
                {percentFilled}% filled — This recognition will never be available again once full
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What You Get Section */}
      <section className="py-12 relative">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-2xl md:text-3xl font-bold text-white text-center mb-4">
              This is what you receive
            </h3>
            <p className="text-gray-400 text-center max-w-xl mx-auto mb-8">
              The <em>Original Founding Citizen Certificate</em> issued to Lunar Citizen No. 000001 —
              a preview of the artwork every Founding Citizen receives, personalised with your own name and coordinates.
            </p>

            <OriginalFoundingCertificate variant="featured" className="mb-10" />

            <h3 className="text-2xl md:text-3xl font-bold text-white text-center mb-8">
              Everything You'll Receive
            </h3>
            
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              {[
                { icon: <Award className="w-6 h-6" />, title: 'Official Luna Birthright Certificate', desc: 'High-resolution PDF ready for download and printing' },
                { icon: <Shield className="w-6 h-6" />, title: 'Blockchain NFT Certificate', desc: 'Your certificate minted as a unique NFT on Polygon' },
                { icon: <Globe className="w-6 h-6" />, title: 'Your name in the global registry', desc: 'Permanently recorded as a Founding Lunar Citizen' },
                { icon: <MessageCircle className="w-6 h-6" />, title: 'Your message preserved permanently', desc: 'Part of humanity\'s digital time capsule to the future' },
                { icon: <Star className="w-6 h-6" />, title: 'Founding Lunar Citizen recognition', desc: 'First generation status — never available again' },
                { icon: <Download className="w-6 h-6" />, title: 'Instant download', desc: 'Certificate available immediately after payment' }
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-4 p-4 bg-gray-900/50 rounded-xl border border-gray-800">
                  <div className="text-green-400 flex-shrink-0 mt-1">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-blue-400">{item.icon}</span>
                      <h4 className="text-white font-semibold">{item.title}</h4>
                    </div>
                    <p className="text-gray-400 text-sm">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Price & CTA Section */}
      <section className="py-12 relative">
        <div className="container mx-auto px-6">
          <div className="max-w-xl mx-auto">
            {/* Live citizens ticker (social proof above the price card) */}
            <LiveCitizensTicker limit={6} />

            {/* Referral Discount Banner */}
            {discountStatus && (
              <div className={`mb-4 p-4 rounded-xl border text-center ${
                discountStatus.discount_eligible 
                  ? 'bg-green-500/20 border-green-500/50' 
                  : 'bg-gray-900/50 border-gray-700'
              }`} data-testid="referral-discount-upgrade-banner">
                {discountStatus.discount_eligible ? (
                  <div className="flex items-center justify-center gap-2">
                    <Gift className="w-5 h-5 text-green-400" />
                    <span className="text-green-400 font-semibold">
                      🎉 Referral discount applied! You save $2
                    </span>
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">
                    <Gift className="w-4 h-4 inline mr-1" />
                    Refer {discountStatus.referrals_until_discount} more friend{discountStatus.referrals_until_discount !== 1 ? 's' : ''} to unlock a $2 discount
                  </p>
                )}
              </div>
            )}

            <div className="bg-gradient-to-br from-yellow-900/30 to-orange-900/30 border-2 border-yellow-500/50 rounded-2xl p-8 text-center">
              <p className="text-yellow-400 font-semibold mb-2">ONE-TIME PAYMENT</p>
              
              {discountStatus?.discount_eligible ? (
                <div className="mb-2" data-testid="upgrade-price">
                  <span className="text-3xl text-gray-500 line-through mr-3">NZ$12</span>
                  <span className="text-6xl font-black text-green-400">NZ$10</span>
                </div>
              ) : (
                <div className="text-6xl font-black text-white mb-2" data-testid="upgrade-price">
                  NZ$12
                </div>
              )}
              
              <p className="text-gray-400 mb-6">
                {discountStatus?.discount_eligible 
                  ? 'Referral discount applied! Instant download. Yours forever.' 
                  : 'Instant download. Yours forever.'}
              </p>
              
              <button
                onClick={handleUpgrade}
                disabled={purchasing}
                className="w-full px-8 py-5 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black text-xl font-black rounded-xl transition transform hover:scale-105 shadow-lg shadow-yellow-500/30 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center"
                data-testid="upgrade-submit-btn"
              >
                {purchasing ? (
                  <>
                    <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'BECOME A FOUNDING CITIZEN'
                )}
              </button>
              
              {/* Trust Signals */}
              <div className="flex flex-wrap justify-center gap-4 mt-6 text-sm text-gray-400">
                <span className="flex items-center gap-1">
                  <Lock className="w-4 h-4" />
                  Secure Payment
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Takes 60 seconds
                </span>
                <span className="flex items-center gap-1">
                  <Zap className="w-4 h-4" />
                  Instant Delivery
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-12 relative">
        <div className="container mx-auto px-6 text-center">
          <p className="text-gray-300 text-lg">
            Join <span className="text-white font-bold">{globalStats.total_registered.toLocaleString()}</span> people from <span className="text-white font-bold">{globalStats.total_countries || 50}+</span> countries who have already claimed their place on the Moon 🌙
          </p>
        </div>
      </section>

      {/* User's Message Preview */}
      {user?.message && (
        <section className="py-12 relative">
          <div className="container mx-auto px-6">
            <div className="max-w-2xl mx-auto">
              <div className="bg-blue-900/20 border border-blue-500/20 rounded-xl p-6 text-center">
                <p className="text-blue-300 text-sm mb-2">Your message to the future:</p>
                <p className="text-white text-lg italic">"{user.message}"</p>
                <p className="text-gray-500 text-sm mt-4">
                  Upgrade to preserve this message permanently in the digital time capsule
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Skip Link */}
      <section className="py-8 text-center">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-gray-500 hover:text-gray-400 transition text-sm"
        >
          Skip for now → Go to Dashboard
        </button>
      </section>

      {/* Footer Disclaimer */}
      <footer className="py-8 border-t border-gray-800">
        <div className="container mx-auto px-6">
          <p className="text-gray-600 text-sm text-center max-w-2xl mx-auto">
            <strong>Disclaimer:</strong> This is a symbolic and inspirational project representing humanity's shared future in space. It does not represent legal ownership of lunar land or financial investment.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default UpgradePage;
