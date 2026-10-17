import { useState } from 'react';
import { Gift, Users, Link as LinkIcon, Check, Copy, Share2 } from 'lucide-react';

const ReferralSection = ({ referralStats, hasCertificate }) => {
  const [copied, setCopied] = useState(false);

  if (!referralStats) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralStats.referral_link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(referralStats.share_message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="mt-8 bg-gradient-to-r from-green-900/30 to-teal-900/30 backdrop-blur-sm p-8 rounded-xl"
      data-testid="referral-section"
    >
      <h2 className="text-2xl font-bold mb-4 flex items-center">
        <Gift className="w-6 h-6 mr-2 text-green-400" />
        Invite Friends to the Moon
      </h2>

      <p className="text-gray-300 mb-6">
        Share your unique referral link and track how many friends you've invited to join the Luna Birthright Registry.
      </p>

      {/* Discount Progress Banner — only when user hasn't bought yet */}
      {!hasCertificate && (
        <div
          className={`mb-6 p-4 rounded-xl border ${
            referralStats.discount_eligible
              ? 'bg-yellow-500/10 border-yellow-500/50'
              : 'bg-gray-900/50 border-gray-700'
          }`}
          data-testid="referral-discount-banner"
        >
          {referralStats.discount_eligible ? (
            <div className="flex items-center gap-3">
              <div className="text-3xl">🎉</div>
              <div>
                <p className="text-yellow-400 font-bold">You've unlocked a $2 discount!</p>
                <p className="text-sm text-gray-300">
                  Thanks for referring {referralStats.referral_count} friends. Pay only{' '}
                  <span className="text-yellow-400 font-bold">NZ$10</span> instead of NZ$12!
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-2xl">🎁</div>
                <div>
                  <p className="text-white font-semibold">Unlock a $2 Discount!</p>
                  <p className="text-sm text-gray-400">
                    Refer {referralStats.referrals_until_discount} more friend
                    {referralStats.referrals_until_discount !== 1 ? 's' : ''} to save $2 on your certificate
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="text-2xl font-bold text-white">{referralStats.referral_count}/3</p>
                  <p className="text-xs text-gray-500">Referrals</p>
                </div>
                <div className="w-16 h-16 relative">
                  <svg className="w-16 h-16 transform -rotate-90">
                    <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="none" className="text-gray-700" />
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                      className="text-green-500"
                      strokeDasharray={`${(referralStats.referral_count / 3) * 176} 176`}
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats Row */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-900/50 p-4 rounded-lg border border-green-500/30 text-center">
          <Users className="w-8 h-8 text-green-400 mx-auto mb-2" />
          <p className="text-3xl font-bold text-white">{referralStats.referral_count}</p>
          <p className="text-sm text-gray-400">Friends Invited</p>
        </div>

        <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 md:col-span-2">
          <p className="text-sm text-gray-400 mb-2">Your Referral Code</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-gray-800 px-4 py-2 rounded-lg text-green-400 font-mono text-lg">
              {referralStats.referral_code}
            </code>
            <button
              onClick={handleCopyLink}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition flex items-center"
              data-testid="copy-referral-link-btn"
            >
              {copied ? <Check className="w-5 h-5" /> : <LinkIcon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Share Buttons */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={handleCopyMessage}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition flex items-center text-sm"
          data-testid="copy-referral-message-btn"
        >
          <Copy className="w-4 h-4 mr-2" />
          {copied ? 'Copied!' : 'Copy Share Message'}
        </button>

        <a
          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(referralStats.share_message)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition flex items-center text-sm"
          data-testid="share-referral-x-btn"
        >
          <Share2 className="w-4 h-4 mr-2" />
          Share on X
        </a>

        <a
          href={`https://wa.me/?text=${encodeURIComponent(referralStats.share_message)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition flex items-center text-sm"
          data-testid="share-referral-whatsapp-btn"
        >
          <Share2 className="w-4 h-4 mr-2" />
          WhatsApp
        </a>
      </div>

      {/* Referred Users List */}
      {referralStats.referred_users && referralStats.referred_users.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 text-gray-300">Your Invited Friends</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {referralStats.referred_users.map((friend) => (
              <div
                key={friend.name + friend.joined}
                className="flex items-center justify-between bg-gray-900/50 px-4 py-2 rounded-lg"
              >
                <span className="text-white">{friend.name}</span>
                <span className="text-gray-400 text-sm">{friend.country} • {friend.joined}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReferralSection;
