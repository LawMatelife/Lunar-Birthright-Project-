import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { authAPI, referralAPI } from '@/utils/api';
import { Globe, Loader2, CheckCircle, Users } from 'lucide-react';

const RegisterPage = ({ setIsAuthenticated }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [referrer, setReferrer] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    birth_date: '',
    country: '',
    message: '',
    referral_code: ''
  });

  useEffect(() => {
    // Check for referral code in URL
    const refCode = searchParams.get('ref');
    if (refCode) {
      setFormData(prev => ({ ...prev, referral_code: refCode }));
      validateReferralCode(refCode);
    }
  }, [searchParams]);

  const validateReferralCode = async (code) => {
    try {
      const response = await referralAPI.validate(code);
      if (response.data.valid) {
        setReferrer(response.data);
      }
    } catch (err) {
      // Invalid or unknown referral code — silent fail
      if (process.env.NODE_ENV === 'development') {
        console.debug('Referral validation failed:', err?.response?.status);
      }
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Validate referral code when changed
    if (name === 'referral_code' && value.length >= 8) {
      validateReferralCode(value);
    } else if (name === 'referral_code') {
      setReferrer(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.register(formData);
      // Cookie is the primary auth; cache user info for UI hydration only
      localStorage.setItem('user', JSON.stringify(response.data.user));
      setIsAuthenticated(true);
      
      // Redirect to the high-converting upgrade page
      navigate('/upgrade');
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen stars-bg flex items-center justify-center px-6 py-12">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Globe className="w-16 h-16 text-blue-400 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-white mb-2" data-testid="register-title">Join the Luna Birthright Registry</h1>
          <p className="text-gray-300">Register your symbolic quarter-acre lunar birthright</p>
        </div>

        {/* Referrer Banner */}
        {referrer && (
          <div className="mb-6 p-4 bg-green-900/30 border border-green-500/50 rounded-xl flex items-center gap-3" data-testid="referrer-banner">
            <Users className="w-8 h-8 text-green-400 flex-shrink-0" />
            <div>
              <p className="text-green-300 font-semibold">Invited by {referrer.referrer_name}</p>
              <p className="text-green-400/70 text-sm">from {referrer.referrer_country}</p>
            </div>
            <CheckCircle className="w-5 h-5 text-green-400 ml-auto" />
          </div>
        )}

        {/* Form */}
        <div className="bg-gray-900/50 backdrop-blur-sm p-8 rounded-xl">
          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-500 rounded text-red-200 text-sm" data-testid="register-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                placeholder="John Doe"
                data-testid="register-input-name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                placeholder="your@email.com"
                data-testid="register-input-email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                placeholder="••••••••"
                data-testid="register-input-password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Birth Date</label>
              <input
                type="date"
                name="birth_date"
                value={formData.birth_date}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                data-testid="register-input-birthdate"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Country
              </label>
              <input
                type="text"
                name="country"
                value={formData.country}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                placeholder="e.g., United States"
                data-testid="register-input-country"
              />
              <p className="text-xs text-gray-500 mt-1">
                Join the global movement for humanity's future in space
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Message to Future Humanity (Time Capsule)
              </label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                placeholder="Leave a message for future generations - your hopes, dreams, or words of wisdom for humanity's future among the stars..."
                data-testid="register-input-message"
              />
              <p className="text-xs text-indigo-400 mt-1">
                Your message will be part of our digital time capsule - a record of humanity's collective voice as we reach for the stars.
              </p>
            </div>

            {/* Referral Code Field */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Referral Code (Optional)
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="referral_code"
                  value={formData.referral_code}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 bg-gray-800 border rounded-lg text-white focus:outline-none uppercase ${
                    referrer ? 'border-green-500 focus:border-green-500' : 'border-gray-700 focus:border-blue-500'
                  }`}
                  placeholder="e.g., ABC12345"
                  maxLength={8}
                  data-testid="register-input-referral"
                />
                {referrer && (
                  <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-400" />
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Were you invited by a friend? Enter their referral code.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg text-white font-semibold transition disabled:opacity-50 flex items-center justify-center"
              data-testid="register-submit-btn"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Registering...
                </>
              ) : (
                'Join the Luna Birthright Registry'
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-gray-400">
            Already have a plot?{' '}
            <Link to="/login" className="text-blue-400 hover:text-blue-300" data-testid="register-login-link">
              Login here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
