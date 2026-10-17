import { useEffect } from 'react';
import { Link } from 'react-router-dom';

/**
 * Reusable page shell for the static legal / marketing pages
 * (About, Terms, Privacy). Space-themed, SEO-friendly, and includes
 * a persistent legal footer.
 */
const LegalPageShell = ({ title, subtitle, children, testId }) => {
  useEffect(() => {
    document.title = `${title} · Lunar Birthright Project`;
    window.scrollTo(0, 0);
  }, [title]);

  return (
    <div className="min-h-screen bg-[#050510] text-gray-200" data-testid={testId}>
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-5 py-5">
          <Link to="/" className="text-lg font-bold text-white flex items-center gap-2" data-testid="legal-header-home-link">
            <span className="text-yellow-400 text-xl">🌙</span> Lunar Birthright
          </Link>
          <nav className="hidden sm:flex gap-5 text-sm text-gray-400">
            <Link to="/founding-collection" className="text-yellow-300 hover:text-yellow-200">★ Founding Collection</Link>
            <Link to="/about" className="hover:text-white">About</Link>
            <Link to="/learn" className="hover:text-white">Learn</Link>
            <Link to="/terms" className="hover:text-white">Terms</Link>
            <Link to="/privacy" className="hover:text-white">Privacy</Link>
          </nav>
        </div>
      </header>

      {/* Body */}
      <main className="max-w-3xl mx-auto px-5 py-14">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-3">{title}</h1>
        {subtitle && <p className="text-lg text-gray-400 mb-10">{subtitle}</p>}
        <div className="prose-lbp space-y-6 text-[15px] leading-relaxed">{children}</div>
      </main>

      {/* Legal footer */}
      <PublicFooter />

      <style>{`
        .prose-lbp h2 { font-size: 1.35rem; font-weight: 700; color: #fde047; margin: 2rem 0 0.5rem; }
        .prose-lbp h3 { font-size: 1.1rem;  font-weight: 600; color: #93c5fd; margin: 1.5rem 0 0.5rem; }
        .prose-lbp p  { color: #d1d5db; }
        .prose-lbp ul { list-style: disc; padding-left: 1.25rem; color: #d1d5db; }
        .prose-lbp ul li { margin: 0.35rem 0; }
        .prose-lbp a  { color: #93c5fd; text-decoration: underline; }
        .prose-lbp strong { color: #fef3c7; }
      `}</style>
    </div>
  );
};

/**
 * Persistent public footer visible on marketing/legal/registry pages.
 * Repeats the legal disclaimer so it can never be missed.
 */
export const PublicFooter = () => (
  <footer className="border-t border-white/10 mt-16" data-testid="public-footer">
    <div className="max-w-4xl mx-auto px-5 py-10 text-sm text-gray-400 space-y-4">
      <p className="text-gray-500">
        <strong className="text-gray-300">Symbolic, educational, commemorative registry only.</strong>{' '}
        No legal ownership, land title, mining rights, exclusion rights, sovereignty, or real estate interest
        is created. The Lunar Birthright Project respects the Outer Space Treaty of 1967. NASA imagery,
        where used, is credited and does not imply NASA endorsement.
      </p>
      <div className="flex flex-wrap gap-4 pt-2 border-t border-white/5">
        <Link to="/" className="hover:text-white">Home</Link>
        <Link to="/about" className="hover:text-white">About</Link>
        <Link to="/learn" className="hover:text-white">Learn</Link>
        <Link to="/terms" className="hover:text-white">Terms</Link>
        <Link to="/privacy" className="hover:text-white">Privacy</Link>
      </div>
      <p className="text-xs text-gray-600 pt-2">
        © {new Date().getFullYear()} Lunar Birthright Project. A symbolic commemorative registry, not a real estate service.
      </p>
    </div>
  </footer>
);

export default LegalPageShell;
