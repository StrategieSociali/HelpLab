import React from 'react';
import { Button } from '@/components/ui/button';
import { Globe, Users, Sprout, ArrowRight } from 'lucide-react';
import sustainabilityHero from '@/assets/sustainability-hero.jpg';

const HeroSection = () => {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background image with overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${sustainabilityHero})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/80 via-primary/60 to-transparent"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 text-center text-white px-6 max-w-4xl mx-auto">
        <div className="space-y-8">
          {/* Main headline */}
          <div className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-bold leading-tight">
              Welcome to
              <span className="block bg-gradient-to-r from-nature-light to-sky-blue bg-clip-text text-transparent">
                HelpLab
              </span>
            </h1>
            <p className="text-2xl md:text-3xl font-semibold text-white/95 mb-4">
              Humanity Empowered for Local Progress
            </p>
            <p className="text-xl md:text-2xl text-white/90 mb-4 font-semibold">
              <strong>Empowering people, transforming communities</strong>
            </p>
            <p className="text-lg md:text-xl text-white/85 max-w-3xl mx-auto leading-relaxed">
              La nostra piattaforma incoraggia comportamenti sostenibili attraverso sfide, 
              percorsi di apprendimento e gamification. Integriamo anche un sistema di micropagamenti 
              con Bitcoin Lightning Network per servizi e un e-commerce di economia circolare locale.
            </p>
          </div>

          {/* Community stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
              <div className="flex items-center justify-center mb-3">
                <Users className="w-8 h-8 text-nature-light" />
              </div>
              <div className="text-3xl font-bold mb-1">50K+</div>
              <div className="text-white/80">Membri attivi</div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
              <div className="flex items-center justify-center mb-3">
                <Sprout className="w-8 h-8 text-nature-light" />
              </div>
              <div className="text-3xl font-bold mb-1">1M+</div>
              <div className="text-white/80">Azioni sostenibili</div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
              <div className="flex items-center justify-center mb-3">
                <Globe className="w-8 h-8 text-nature-light" />
              </div>
              <div className="text-3xl font-bold mb-1">150+</div>
              <div className="text-white/80">Paesi coinvolti</div>
            </div>
          </div>

          {/* Call to action */}
          <div className="space-y-4">
            <Button 
              variant="community" 
              size="lg" 
              className="px-8 py-4 text-lg font-semibold bg-white text-primary hover:bg-white/90"
            >
              Inizia il tuo viaggio
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <p className="text-white/70 text-sm">
              Gratuito • Community globale • Impatto reale
            </p>
          </div>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-background to-transparent"></div>
    </div>
  );
};

export default HeroSection;