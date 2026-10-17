import { useState, useEffect, useCallback } from 'react';
import './App.css';
import './luna.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SpeedInsights } from '@vercel/speed-insights/react';
import LunaLandingPage from './pages/LunaLandingPage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import EducationalPage from './pages/EducationalPage';
import AdminDashboard from './pages/AdminDashboard';
import MoonExplorer from './pages/MoonExplorer';
import CertificatePage from './pages/CertificatePage';
import UpgradePage from './pages/UpgradePage';
import VerifyPage from './pages/VerifyPage';
import AboutPage from './pages/AboutPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import FoundingCollectionPage from './pages/FoundingCollectionPage';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Auth source-of-truth is the httpOnly cookie. We use a cached `user` in
  // localStorage (set by login/register, cleared by logout) as a synchronous
  // hint for routing. If the cookie is missing/expired, /api/auth/me will 401
  // and the centralized interceptor in utils/api.js redirects to /login.
  const checkAuth = useCallback(() => {
    if (localStorage.getItem('user')) {
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const ProtectedRoute = ({ children }) => {
    const hasUser = !!localStorage.getItem('user');
    return hasUser ? children : <Navigate to="/login" />;
  };

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LunaLandingPage />} />
          <Route path="/gift" element={<LunaLandingPage initialGiftMode />} />
          <Route path="/register" element={<RegisterPage setIsAuthenticated={setIsAuthenticated} />} />
          <Route path="/login" element={<LoginPage setIsAuthenticated={setIsAuthenticated} />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard setIsAuthenticated={setIsAuthenticated} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/upgrade" 
            element={
              <ProtectedRoute>
                <UpgradePage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/certificate" 
            element={
              <ProtectedRoute>
                <CertificatePage />
              </ProtectedRoute>
            } 
          />
          <Route path="/learn" element={<EducationalPage />} />
          <Route path="/moon-explorer" element={<MoonExplorer />} />
          <Route path="/verify/:certificateNumber" element={<VerifyPage />} />
          <Route path="/registry/:certificateNumber" element={<VerifyPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/founding-collection" element={<FoundingCollectionPage />} />
          <Route path="/nft-collection" element={<FoundingCollectionPage />} />
          <Route path="/founding-certificate" element={<FoundingCollectionPage />} />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </BrowserRouter>
      <SpeedInsights />
    </div>
  );
}

export default App;