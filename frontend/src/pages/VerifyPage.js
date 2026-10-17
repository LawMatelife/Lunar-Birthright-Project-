import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { verifyAPI } from '@/utils/api';
import { 
  Shield, CheckCircle, XCircle, Award, Globe, MapPin, 
  Calendar, ExternalLink, Loader2, Star
} from 'lucide-react';

const VerifyPage = () => {
  const { certificateNumber } = useParams();
  const [loading, setLoading] = useState(true);
  const [verification, setVerification] = useState(null);
  const [error, setError] = useState(null);

  const verifyContract = useCallback(async () => {
    try {
      setLoading(true);
      const response = await verifyAPI.getCertificate(certificateNumber);
      setVerification(response.data);
      setError(null);
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Certificate not found in the Luna Birthright Registry.');
      } else {
        setError('Unable to verify certificate. Please try again.');
      }
      setVerification(null);
    } finally {
      setLoading(false);
    }
  }, [certificateNumber]);

  useEffect(() => {
    if (certificateNumber) {
      verifyContract();
    }
  }, [certificateNumber, verifyContract]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050510] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-yellow-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Verifying certificate...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050510] py-12 px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <Link to="/" className="inline-block">
          <h1 className="text-2xl font-bold text-yellow-400">LUNA BIRTHRIGHT PROJECT</h1>
        </Link>
        <p className="text-gray-400 mt-2">Certificate Verification</p>
      </div>

      <div className="max-w-2xl mx-auto">
        {error ? (
          /* Error State */
          <div className="bg-red-900/20 border border-red-500/50 rounded-2xl p-8 text-center">
            <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Verification Failed</h2>
            <p className="text-gray-400 mb-6">{error}</p>
            <p className="text-sm text-gray-500">
              Certificate: <span className="font-mono text-gray-400">{certificateNumber}</span>
            </p>
            <Link 
              to="/" 
              className="inline-block mt-6 px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-white transition"
            >
              Return to Homepage
            </Link>
          </div>
        ) : verification && (
          /* Success State */
          <div className="bg-gradient-to-br from-green-900/20 to-gray-900/50 border border-green-500/50 rounded-2xl overflow-hidden">
            {/* Verified Badge */}
            <div className="bg-green-900/30 px-6 py-4 flex items-center justify-center gap-3 border-b border-green-500/30">
              <CheckCircle className="w-6 h-6 text-green-400" />
              <span className="text-green-400 font-semibold text-lg">VERIFIED CERTIFICATE</span>
            </div>

            {/* Certificate Content */}
            <div className="p-8">
              {/* Status Badge */}
              {verification.is_founding_citizen && (
                <div className="flex justify-center mb-6">
                  <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-full px-6 py-2 flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-400" />
                    <span className="text-yellow-400 font-semibold">Founding Lunar Citizen</span>
                  </div>
                </div>
              )}

              {/* Name */}
              <div className="text-center mb-8">
                <p className="text-gray-400 text-sm mb-1">This certifies that</p>
                <h2 className="text-4xl font-bold text-white mb-2">{verification.full_name}</h2>
                <p className="text-blue-400 text-xl">Citizen #{verification.citizen_number?.toLocaleString()}</p>
              </div>

              {/* Certificate Details */}
              <div className="bg-gray-900/50 rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                  <div>
                    <p className="text-gray-400 text-sm">Certificate Number</p>
                    <p className="text-white font-mono">{verification.certificate_number}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Award className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                  <div>
                    <p className="text-gray-400 text-sm">Status</p>
                    <p className="text-white">{verification.status}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                  <div>
                    <p className="text-gray-400 text-sm">Country</p>
                    <p className="text-white">{verification.country}</p>
                  </div>
                </div>

                {verification.birth_moon_phase && (
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 flex-shrink-0 text-cyan-300">◐</div>
                    <div>
                      <p className="text-gray-400 text-sm">Birth Moon</p>
                      <p className="text-cyan-200">
                        {verification.birth_moon_phase}
                        {verification.birth_moon_illumination !== null && verification.birth_moon_illumination !== undefined
                          ? ` • ${verification.birth_moon_illumination}% illuminated`
                          : ''}
                      </p>
                      {verification.birth_moon_region && <p className="text-gray-500 text-xs">Symbolic region: {verification.birth_moon_region}</p>}
                    </div>
                  </div>
                )}

                {verification.moon_region && (
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                    <div>
                      <p className="text-gray-400 text-sm">Moon Region</p>
                      <p className="text-white">{verification.moon_region}{verification.sector ? `, ${verification.sector}` : ''}</p>
                    </div>
                  </div>
                )}

                {verification.claim_date && (
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                    <div>
                      <p className="text-gray-400 text-sm">Claim Date</p>
                      <p className="text-white">{new Date(verification.claim_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                  </div>
                )}

                {/* NFT Info */}
                {verification.nft_minted && (
                  <div className="pt-4 mt-4 border-t border-gray-700">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 flex-shrink-0 text-purple-400">🎨</div>
                      <div>
                        <p className="text-gray-400 text-sm">NFT Certificate</p>
                        <p className="text-purple-300 font-mono text-sm">
                          {verification.nft_token_id || 'Minted'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Registry Info */}
              <div className="mt-6 text-center text-gray-500 text-sm">
                <p>Recorded in the <span className="text-yellow-400">{verification.registry}</span></p>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-900/30 px-6 py-4 text-center border-t border-gray-800">
              <Link 
                to="/" 
                className="inline-flex items-center gap-2 text-yellow-400 hover:text-yellow-300 transition"
              >
                <ExternalLink className="w-4 h-4" />
                Visit Luna Birthright Project
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyPage;
