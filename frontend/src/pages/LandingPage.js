import { useNavigate } from 'react-router-dom';
import { Rocket, Globe, Shield, BookOpen, Users, Star } from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen stars-bg text-white">
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-6 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Globe className="w-8 h-8 text-blue-400" />
          <span className="text-2xl font-bold gradient-text">Lunar Birthright</span>
        </div>
        <div className="space-x-4">
          <button 
            onClick={() => navigate('/login')}
            className="px-6 py-2 text-white hover:text-blue-400 transition"
            data-testid="nav-login-btn"
          >
            Login
          </button>
          <button 
            onClick={() => navigate('/register')}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
            data-testid="nav-register-btn"
          >
            Claim Your Plot
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-6xl font-bold mb-6" data-testid="hero-title">
            Your <span className="gradient-text">Quarter Acre</span> on the Moon
          </h1>
          <p className="text-xl text-gray-300 mb-8" data-testid="hero-subtitle">
            Every human being deserves a piece of our celestial heritage. 
            Claim your FREE quarter-acre plot on the Moon - it's your birthright.
          </p>
          <button 
            onClick={() => navigate('/register')}
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg text-xl font-semibold transition transform hover:scale-105"
            data-testid="hero-cta-btn"
          >
            Claim Your Free Plot Now →
          </button>
        </div>

        {/* Moon Image - Clickable, leads to map of all plots */}
        <div className="mt-20 relative cursor-pointer" onClick={() => navigate('/moon-explorer')} data-testid="clickable-moon">
          <div className="relative w-96 h-96 mx-auto group">
            {/* Real moon image - multiple fallback sources */}
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/e/e1/FullMoon2010.jpg" 
              alt="Full Moon - Click to explore all plots" 
              className="w-full h-full rounded-full moon-glow object-cover transition-transform group-hover:scale-105"
              data-testid="hero-moon-image"
              onError={(e) => {
                // Fallback 1: Try NASA image
                if (e.target.src.includes('wikimedia')) {
                  e.target.src = 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/FullMoon2010.jpg/1024px-FullMoon2010.jpg';
                }
              }}
            />
            {/* Hover overlay */}
            <div className="absolute inset-0 rounded-full bg-blue-500 opacity-0 group-hover:opacity-20 transition-opacity flex items-center justify-center">
              <span className="text-white text-xl font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                🗺️ Explore All Plots
              </span>
            </div>
          </div>
          <p className="text-center mt-4 text-blue-300 text-sm">
            👆 Click the moon to see all claimed plots on an interactive map
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-6 py-20">
        <h2 className="text-4xl font-bold text-center mb-16" data-testid="features-title">Why Lunar Birthright?</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-gray-900/50 backdrop-blur-sm p-8 rounded-xl card-hover" data-testid="feature-card-equality">
            <Users className="w-12 h-12 text-blue-400 mb-4" />
            <h3 className="text-2xl font-bold mb-3">Universal Equality</h3>
            <p className="text-gray-300">
              Everyone gets an equal share. No corporations, no governments - just people exercising their birthright to space.
            </p>
          </div>

          <div className="bg-gray-900/50 backdrop-blur-sm p-8 rounded-xl card-hover" data-testid="feature-card-free">
            <Star className="w-12 h-12 text-purple-400 mb-4" />
            <h3 className="text-2xl font-bold mb-3">Free Plot + NFT</h3>
            <p className="text-gray-300">
              Claiming your quarter-acre plot is 100% FREE. Optional official certificate with blockchain NFT available for NZ$12.
            </p>
          </div>

          <div className="bg-gray-900/50 backdrop-blur-sm p-8 rounded-xl card-hover" data-testid="feature-card-educational">
            <BookOpen className="w-12 h-12 text-pink-400 mb-4" />
            <h3 className="text-2xl font-bold mb-3">Educational Mission</h3>
            <p className="text-gray-300">
              Learn about the Moon, space law, and human rights while exploring your lunar property.
            </p>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="max-w-3xl mx-auto bg-gradient-to-r from-blue-900/30 to-purple-900/30 backdrop-blur-sm p-12 rounded-2xl" data-testid="mission-section">
          <Shield className="w-16 h-16 text-blue-400 mx-auto mb-6" />
          <h2 className="text-4xl font-bold text-center mb-6">Our Mission</h2>
          <p className="text-xl text-gray-300 text-center leading-relaxed">
            The Outer Space Treaty states that no nation can claim the Moon. 
            But it doesn't address individual rights. We believe every person on Earth 
            deserves an equal share of our celestial heritage. With 37.6 billion 
            quarter-acre plots available, there's more than enough for everyone - 
            and generations to come.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-20 text-center">
        <h2 className="text-5xl font-bold mb-6" data-testid="cta-title">Ready to Claim Your Lunar Legacy?</h2>
        <p className="text-xl text-gray-300 mb-8">
          Join thousands of people who have already claimed their birthright.
        </p>
        <button 
          onClick={() => navigate('/register')}
          className="px-10 py-5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg text-2xl font-semibold transition transform hover:scale-105"
          data-testid="cta-register-btn"
        >
          Get Started - It's Free!
        </button>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-12 text-center text-gray-400 border-t border-gray-800">
        <p data-testid="footer-text">© 2025 Lunar Birthright Project. Empowering humanity, one plot at a time.</p>
      </footer>
    </div>
  );
};

export default LandingPage;