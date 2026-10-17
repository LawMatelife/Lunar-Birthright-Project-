import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { educationalAPI } from '@/utils/api';
import { Globe, BookOpen, Scale, Users, ArrowLeft } from 'lucide-react';

const EducationalPage = () => {
  const navigate = useNavigate();
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      const response = await educationalAPI.getContent();
      setContent(response.data);
    } catch (error) {
      console.error('Error loading content:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'astronomy':
        return <Globe className="w-6 h-6" />;
      case 'law':
        return <Scale className="w-6 h-6" />;
      case 'rights':
        return <Users className="w-6 h-6" />;
      default:
        return <BookOpen className="w-6 h-6" />;
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'astronomy':
        return 'from-blue-600 to-cyan-600';
      case 'law':
        return 'from-purple-600 to-pink-600';
      case 'rights':
        return 'from-green-600 to-emerald-600';
      default:
        return 'from-gray-600 to-gray-700';
    }
  };

  return (
    <div className="min-h-screen stars-bg text-white">
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-6 flex justify-between items-center border-b border-gray-800">
        <div className="flex items-center space-x-2">
          <Globe className="w-8 h-8 text-blue-400" />
          <span className="text-2xl font-bold gradient-text">Lunar Birthright</span>
        </div>
        <button 
          onClick={() => navigate(-1)}
          className="px-4 py-2 text-white hover:text-blue-400 transition flex items-center"
          data-testid="nav-back-btn"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back
        </button>
      </nav>

      <div className="container mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <BookOpen className="w-16 h-16 text-blue-400 mx-auto mb-4" />
          <h1 className="text-5xl font-bold mb-4" data-testid="educational-title">Learn About Your Birthright</h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Discover the science, law, and philosophy behind the Lunar Birthright Project
          </p>
        </div>

        {/* Content Cards */}
        {loading ? (
          <div className="text-center text-gray-400">Loading...</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {content.map((item) => (
              <div 
                key={item.id}
                className="bg-gray-900/50 backdrop-blur-sm rounded-xl overflow-hidden card-hover"
                data-testid={`educational-card-${item.id}`}
              >
                <div className={`bg-gradient-to-r ${getCategoryColor(item.category)} p-6`}>
                  <div className="flex items-center space-x-3">
                    {getCategoryIcon(item.category)}
                    <h2 className="text-2xl font-bold">{item.title}</h2>
                  </div>
                </div>
                <div className="p-6">
                  <p className="text-gray-300 leading-relaxed">{item.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Additional Info Section */}
        <div className="mt-16 max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 backdrop-blur-sm p-12 rounded-2xl">
            <h2 className="text-3xl font-bold mb-6 text-center">Why This Matters</h2>
            <div className="space-y-4 text-gray-300 text-lg leading-relaxed">
              <p>
                The Lunar Birthright Project isn't just about owning a piece of the Moon - 
                it's about establishing a precedent for how humanity approaches space exploration 
                and celestial resource management.
              </p>
              <p>
                By claiming your quarter-acre plot, you're participating in a movement that 
                believes space should be democratized, not monopolized by governments or corporations.
              </p>
              <p>
                With 37.6 billion plots available, there's enough for every person alive today 
                and many generations to come. Your birthright is secure.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <button 
            onClick={() => navigate('/dashboard')}
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg text-xl font-semibold transition"
            data-testid="educational-cta-btn"
          >
            View Your Plot
          </button>
        </div>
      </div>
    </div>
  );
};

export default EducationalPage;