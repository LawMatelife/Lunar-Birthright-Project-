import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '@/utils/api';
import { Download, Printer, ArrowLeft, Loader2, Star } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import OriginalFoundingCertificate from '@/components/OriginalFoundingCertificate';

const CertificatePage = () => {
  const navigate = useNavigate();
  const certificateRef = useRef(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadUserData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUserData = async () => {
    try {
      const response = await authAPI.getMe();
      setUser(response.data);
    } catch (err) {
      if (err.response?.status === 401) {
        navigate('/login');
        return;
      }
      setError('Failed to load certificate data. Please log in again.');
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    if (!certificateRef.current) return;
    
    setDownloading(true);
    try {
      const canvas = await html2canvas(certificateRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#0a0a1a'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Luna_Birthright_Certificate_${user?.certificate_number || 'certificate'}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Error generating PDF. Please try printing instead.');
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center text-white">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-3 bg-blue-600 rounded-lg"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const registrationDate = user?.created_at 
    ? new Date(user.created_at).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    : new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white">
      {/* Controls - Hidden when printing */}
      <div className="print:hidden container mx-auto px-6 py-6 flex justify-between items-center border-b border-gray-800">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center text-gray-400 hover:text-white transition"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Dashboard
        </button>
        
        <div className="flex gap-4">
          <button
            onClick={handlePrint}
            className="flex items-center px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
          >
            <Printer className="w-5 h-5 mr-2" />
            Print
          </button>
          <button
            onClick={downloadPDF}
            disabled={downloading}
            className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg transition disabled:opacity-50"
          >
            {downloading ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <Download className="w-5 h-5 mr-2" />
            )}
            Download PDF
          </button>
        </div>
      </div>

      {/* Certificate */}
      <div className="container mx-auto px-6 py-12 flex justify-center">
        <div 
          ref={certificateRef}
          className="certificate-container w-full max-w-4xl aspect-[1.414/1] bg-gradient-to-br from-[#0a0a1a] via-[#0d1033] to-[#0a0a1a] rounded-lg overflow-hidden relative"
          style={{
            boxShadow: '0 0 60px rgba(96, 165, 250, 0.3), inset 0 0 100px rgba(96, 165, 250, 0.05)'
          }}
        >
          {/* Stars Background */}
          <div className="absolute inset-0 opacity-30">
            {[...Array(50)].map((_, i) => (
              <div
                key={`star-${i}`}
                className="absolute w-1 h-1 bg-white rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  opacity: Math.random() * 0.8 + 0.2
                }}
              />
            ))}
          </div>

          {/* Border Frame */}
          <div className="absolute inset-4 border-2 border-yellow-600/40 rounded-lg pointer-events-none" />
          <div className="absolute inset-6 border border-yellow-600/20 rounded-lg pointer-events-none" />

          {/* Corner Decorations */}
          <div className="absolute top-8 left-8 w-16 h-16 border-l-2 border-t-2 border-yellow-500/50" />
          <div className="absolute top-8 right-8 w-16 h-16 border-r-2 border-t-2 border-yellow-500/50" />
          <div className="absolute bottom-8 left-8 w-16 h-16 border-l-2 border-b-2 border-yellow-500/50" />
          <div className="absolute bottom-8 right-8 w-16 h-16 border-r-2 border-b-2 border-yellow-500/50" />

          {/* Content */}
          <div className="relative z-10 h-full flex flex-col items-center justify-center p-12 text-center">
            {/* Moon Icon */}
            <div className="mb-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-200 to-gray-400 shadow-lg shadow-blue-500/30 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-100 to-gray-300" />
              </div>
            </div>

            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-serif text-yellow-400 mb-2 tracking-wider">
              LUNA BIRTHRIGHT PROJECT
            </h1>
            
            <div className="flex items-center gap-2 mb-6">
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="text-yellow-500/80 text-sm tracking-widest uppercase">Certificate of Registration</span>
              <Star className="w-4 h-4 text-yellow-500" />
            </div>

            {/* Main Text */}
            <p className="text-gray-400 mb-6 max-w-2xl text-sm">
              This is to certify that
            </p>

            {/* Name */}
            <h2 className="text-4xl md:text-5xl font-serif text-white mb-6 tracking-wide">
              {user?.full_name || 'Certificate Holder'}
            </h2>

            {/* Description */}
            <p className="text-gray-300 mb-8 max-w-2xl leading-relaxed">
              has been registered in the Luna Birthright Registry and is hereby granted a symbolic 
              quarter-acre lunar birthright, affirming the belief that the Moon and the future of 
              space belong to all humanity.
            </p>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-8 mb-8 text-sm">
              <div className="text-right pr-4 border-r border-gray-700">
                <p className="text-gray-500 mb-1">Certificate Number</p>
                <p className="text-yellow-400 font-mono text-lg">{user?.certificate_number || 'LBP-2025-000001'}</p>
              </div>
              <div className="text-left pl-4">
                <p className="text-gray-500 mb-1">Lunar Sector</p>
                <p className="text-blue-400 text-lg">{user?.lunar_sector || 'Mare Tranquillitatis'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-8 text-sm">
              <div className="text-right pr-4 border-r border-gray-700">
                <p className="text-gray-500 mb-1">Registration Date</p>
                <p className="text-gray-300">{registrationDate}</p>
              </div>
              <div className="text-left pl-4">
                <p className="text-gray-500 mb-1">Country</p>
                <p className="text-gray-300">{user?.country || 'Earth'}</p>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-auto pt-4 border-t border-gray-800 w-full max-w-lg">
              <p className="text-gray-600 text-xs">
                This is a symbolic registration affirming humanity's shared celestial heritage.
                <br />
                This document does not constitute legal ownership of lunar territory.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .certificate-container {
            width: 100vw !important;
            height: 100vh !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            border-radius: 0 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default CertificatePage;
