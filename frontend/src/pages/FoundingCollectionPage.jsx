import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Shield, Sparkles } from 'lucide-react';
import OriginalFoundingCertificate from '../components/OriginalFoundingCertificate';
import { PublicFooter } from '../components/LegalPageShell';

/**
 * Public "Founding Collection" showcase page.
 *
 * Serves the user's requested "NFT Collection page" and "Founding Certificate page"
 * with the Original Founding Citizen Certificate as the hero centrepiece.
 *
 * Route: /founding-collection
 */
export default function FoundingCollectionPage() {
  useEffect(() => {
    document.title = 'Founding Collection · Lunar Birthright Project';
    window.scrollTo(0, 0);
  }, []);

  return (
    <div
      className="min-h-screen bg-[#050510] text-gray-200"
      data-testid="founding-collection-page"
    >
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-5 py-5">
          <Link
            to="/"
            className="text-lg font-bold text-white flex items-center gap-2"
            data-testid="collection-header-home-link"
          >
            <span className="text-yellow-400 text-xl">🌙</span> Lunar Birthright
          </Link>
          <nav className="hidden sm:flex gap-5 text-sm text-gray-400">
            <Link to="/" className="hover:text-white">Home</Link>
            <Link to="/about" className="hover:text-white">About</Link>
            <Link to="/learn" className="hover:text-white">Learn</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-16 pb-10 px-5 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-500/15 border border-yellow-500/30 rounded-full mb-4">
          <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
          <span className="text-yellow-300 text-xs font-semibold tracking-widest uppercase">
            The Founding Collection
          </span>
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-4">
          The Original Founding<br className="hidden sm:block" />
          <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
            Citizen Certificate
          </span>
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto">
          The very first record in the Lunar Birthright Project archive —
          Daniel Heslip, Lunar Citizen No. 000001, symbolic first quarter acre of the Moon,
          preserved forever with a Digital Archive Key NFT record.
        </p>
      </section>

      {/* Featured certificate */}
      <section className="pb-20 px-5">
        <div className="max-w-4xl mx-auto">
          <OriginalFoundingCertificate variant="featured" />
        </div>
      </section>

      {/* What makes a Founding certificate */}
      <section className="py-16 px-5 border-t border-white/5 bg-gradient-to-b from-transparent to-[#0a0a1a]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-10">
            What every Founding Citizen receives
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                title: 'Personalised commemorative artwork',
                desc: 'Same visual style as certificate No. 000001, rendered with your name, message and lunar coordinates.',
              },
              {
                title: 'Permanent registry record',
                desc: 'Your entry stored in the Lunar Birthright archive with a unique certificate ID (LBP-FLC-XXXXXX) and a public verification URL.',
              },
              {
                title: 'Digital Archive Key NFT',
                desc: 'A symbolic on-chain token attached to your certificate — no ownership rights, purely commemorative.',
              },
              {
                title: 'Message-to-the-future preservation',
                desc: 'Your personal message archived alongside your certificate, visible on your public registry page forever.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="p-5 rounded-xl bg-gray-900/50 border border-gray-800"
              >
                <h3 className="text-white font-semibold mb-1">{item.title}</h3>
                <p className="text-gray-400 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link
              to="/#claim"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold hover:from-yellow-400 hover:to-orange-400 transition"
              data-testid="collection-cta-claim"
            >
              Claim your Founding Citizen certificate
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Disclaimer band */}
      <section className="py-10 px-5">
        <div className="max-w-3xl mx-auto flex items-start gap-3 text-sm text-gray-400 p-5 border border-gray-800 rounded-xl bg-gray-900/30">
          <Shield className="w-5 h-5 text-yellow-500/70 flex-shrink-0 mt-0.5" />
          <p>
            <strong className="text-gray-200">Symbolic, educational, commemorative registry only.</strong>{' '}
            No legal ownership, land title, mining rights, sovereignty, or real estate interest is
            created. The Lunar Birthright Project respects the Outer Space Treaty of 1967.
            NASA imagery, where used, is credited and does not imply NASA endorsement.
          </p>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
