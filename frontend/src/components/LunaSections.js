/* FAQ Section Component */
export const FAQSection = () => {
  const faqs = [
    {
      question: "What is the Luna Birthright Project?",
      answer: "The Luna Birthright Project is a global symbolic registry affirming that the Moon and the future of space belong to all humanity. It allows people worldwide to register their symbolic quarter-acre lunar birthright as part of a movement supporting humanity's shared celestial future."
    },
    {
      question: "Does this mean I legally own land on the Moon?",
      answer: "No. This is a symbolic and commemorative registration only. It is not a legal property title or recognised deed. The Outer Space Treaty of 1967 prohibits national appropriation of celestial bodies. This project is about affirming a philosophical belief in shared celestial heritage, not legal ownership."
    },
    {
      question: "What do I receive when I register?",
      answer: "You receive: entry in the Luna Birthright Registry, a unique certificate number (LBP-YYYY-######), registration date, symbolic lunar sector reference, and access to view and share your commemorative certificate. Premium downloadable certificates are available for a small fee."
    },
    {
      question: "Why is the project important?",
      answer: "As humanity returns to the Moon, this project serves as a declaration that space exploration should benefit all people, not just governments, corporations, or the wealthy. It's a symbolic stand for equality and shared heritage in humanity's future beyond Earth."
    },
    {
      question: "Who can join?",
      answer: "Anyone from anywhere in the world can join the Luna Birthright Registry. This is a global movement open to all humanity."
    }
  ];

  return (
    <section className="py-20 relative">
      <div className="container mx-auto px-6">
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-12 text-white">
          Frequently Asked Questions
        </h2>
        
        <div className="max-w-4xl mx-auto space-y-6">
          {faqs.map((faq) => (
            <details key={faq.question} className="bg-gray-900/50 backdrop-blur-sm p-6 rounded-xl border border-gray-700 hover:border-blue-500/50 transition">
              <summary className="text-xl font-semibold text-white cursor-pointer list-none flex justify-between items-center">
                {faq.question}
                <span className="text-blue-400 ml-4">+</span>
              </summary>
              <p className="mt-4 text-gray-300 leading-relaxed">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>

        <p className="text-center text-gray-400 mt-12 max-w-3xl mx-auto">
          <strong className="text-white">Important Disclaimer:</strong> The Luna Birthright Project is a symbolic and commemorative registry. 
          Certificates represent philosophical support for humanity's shared future in space, not legal property titles.
        </p>
      </div>
    </section>
  );
};

/* Future of Humanity Section */
export const FutureSection = () => {
  return (
    <section className="py-20 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-blue-950/20 to-black"></div>
      <div className="container mx-auto px-6 relative z-10">
        <h2 className="text-5xl md:text-6xl font-bold text-center mb-12 text-white">
          The Future of Humanity in Space
        </h2>
        
        <div className="max-w-4xl mx-auto space-y-6 text-lg md:text-xl text-gray-300 leading-relaxed">
          <p className="text-2xl font-semibold text-blue-300">
            Humanity stands at the threshold of a new era.
          </p>
          <p>
            The Moon may soon become the first permanent step in our journey beyond Earth — a place of science, exploration, industry, and eventually human settlement.
          </p>
          <p className="text-xl font-semibold text-white">
            The question is not whether humanity will return to the Moon.
          </p>
          <p className="text-xl font-semibold text-white">
            The deeper question is who that future will belong to.
          </p>
          <p className="text-2xl text-center py-8 text-purple-300 font-semibold">
            The Luna Birthright Project exists to ensure that the future of space includes all people.
          </p>
        </div>
      </div>
    </section>
  );
};

/* Final CTA Section */
export const FinalCTA = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToRegistration = () => {
    document.getElementById('registration-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-t from-black via-purple-950/30 to-black"></div>
      
      {/* Background stars */}
      <div className="absolute inset-0 stars-bg opacity-50"></div>

      <div className="container mx-auto px-6 relative z-10 text-center">
        <h2 className="text-5xl md:text-7xl font-bold mb-8 text-white">
          Claim Your Place in Humanity's Future
        </h2>
        
        <p className="text-2xl text-gray-300 mb-12 max-w-3xl mx-auto">
          Add your name to the Luna Birthright Registry and join a growing global movement supporting humanity's shared future in space.
        </p>

        <div className="flex flex-col sm:flex-row gap-6 justify-center">
          <button
            onClick={scrollToRegistration}
            className="px-10 py-5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-2xl font-bold rounded-lg transition transform hover:scale-105 glow-button"
            data-testid="final-register-btn"
          >
            Join the Registry
          </button>
          <button
            onClick={() => window.location.href = '/login'}
            className="px-10 py-5 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white text-2xl font-semibold rounded-lg transition border border-white/30"
            data-testid="final-certificate-btn"
          >
            Get My Certificate
          </button>
        </div>

        <p className="text-gray-500 mt-8 text-sm">
          Registration is free • Premium certificates available
        </p>
      </div>
    </section>
  );
};

/* Footer */
export const Footer = () => {
  return (
    <footer className="py-12 border-t border-gray-800">
      <div className="container mx-auto px-6 text-center">
        <p className="text-gray-400 mb-4">
          © 2026 Luna Birthright Project
        </p>
        <p className="text-gray-500 text-sm max-w-2xl mx-auto">
          A global movement for humanity's shared celestial future. 
          This is a symbolic registry, not a legal property title.
        </p>
      </div>
    </footer>
  );
};
