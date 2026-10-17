import { CheckCircle, Download, Image, Loader2, Shield } from 'lucide-react';
import ShareBar from '../ShareBar';

const SuccessCelebration = ({
  user,
  onDownloadPdf,
  onDownloadShareCard,
  downloadingCard,
  onDismiss,
}) => {
  const certNum = user?.certificate_number || '';

  return (
    <div
      className="mb-8 bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-yellow-500/20 border-2 border-yellow-500/50 rounded-xl p-8 text-center"
      data-testid="success-banner"
    >
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-full mb-4">
        <CheckCircle className="w-5 h-5 text-green-400" />
        <span className="text-green-300 font-semibold">Your certificate is ready! 🌙</span>
      </div>

      <h2 className="text-3xl md:text-4xl font-bold mb-4">
        <span className="text-yellow-400">You Are Founding Lunar Citizen</span>
      </h2>

      <p className="text-gray-300 mb-6 max-w-xl mx-auto">
        Download your official certificate and share your Lunar Birthright.
      </p>

      <div className="flex flex-wrap gap-4 justify-center mb-6">
        <button
          onClick={onDownloadPdf}
          className="px-8 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black rounded-xl font-bold text-lg transition flex items-center shadow-lg shadow-yellow-500/30"
          data-testid="download-pdf-btn"
        >
          <Download className="w-6 h-6 mr-2" />
          Download Certificate (PDF)
        </button>

        <button
          onClick={onDownloadShareCard}
          disabled={downloadingCard}
          className="px-5 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition flex items-center disabled:opacity-50"
          data-testid="download-share-card-btn"
        >
          {downloadingCard ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <Image className="w-5 h-5 mr-2" />
          )}
          {downloadingCard ? 'Generating...' : 'Share Card'}
        </button>
      </div>

      <div className="max-w-2xl mx-auto text-left">
        <ShareBar
          source="success-celebration"
          referralCode={user?.referral_code || ''}
          url={certNum
            ? `https://www.lunarbirthrightproject.com/registry/${certNum}`
            : 'https://www.lunarbirthrightproject.com'}
          text="I just claimed my symbolic place on the Moon with the Lunar Birthright Project. Claim yours free:"
        />
      </div>

      <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl max-w-md mx-auto my-4">
        <div className="flex items-center gap-2 text-purple-300 text-sm">
          <Shield className="w-4 h-4" />
          <span>Your certificate has been recorded in the public registry.</span>
        </div>
      </div>

      <button onClick={onDismiss} className="text-gray-500 hover:text-gray-300 text-sm" data-testid="success-dismiss-btn">
        Dismiss
      </button>
    </div>
  );
};

export default SuccessCelebration;
