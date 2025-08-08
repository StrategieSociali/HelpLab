import React from 'react';
import HeroSection from '@/components/HeroSection';
import FeaturesTable from '@/components/FeaturesTable';
import CommunityBenefits from '@/components/CommunityBenefits';
import SupportSection from '@/components/SupportSection';
import RegistrationForm from '@/components/RegistrationForm';

const Index = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <HeroSection />
      
      {/* Features Table */}
      <FeaturesTable />
      
      {/* Community Benefits */}
      <CommunityBenefits />
      
      {/* Support Section */}
      <SupportSection />
      
      {/* Registration Section */}
      <section className="py-20 px-6 bg-background">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Inizia il Tuo Viaggio Sostenibile
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Unisciti oggi stesso alla nostra community e inizia a fare la differenza 
            per il pianeta. La registrazione è gratuita e immediata.
          </p>
        </div>
        
        <RegistrationForm />
      </section>
    </div>
  );
};

export default Index;
