import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Mail, 
  Bitcoin, 
  Github, 
  Calendar,
  MapPin,
  Rocket
} from 'lucide-react';

const SupportSection = () => {
  const handleEmailContact = () => {
    const subject = encodeURIComponent("Request More Information about HelpLab");
    const body = encodeURIComponent("Introduce yourself and describe your interests in HelpLab and your skills.");
    window.location.href = `mailto:antonio@strategiesociali.it?subject=${subject}&body=${body}`;
  };

  const handleBitcoinSupport = () => {
    window.location.href = "lightning:strategiesociali@blink.sv";
  };

  return (
    <section className="py-20 px-6 bg-gradient-sky">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-nature flex items-center justify-center">
              <Rocket className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Support the Project
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            HelpLab is actively developing and will be tested in local communities 
            across Italy in the summer of 2025. Our frontend will be open-source and released on GitHub.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Join Community Card */}
          <Card className="border-primary/20 hover:border-primary/40 transition-colors duration-300">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-nature flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-4">
                Join Our Community
              </h3>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Get more information about HelpLab and connect with our team. 
                Share your interests and skills to become part of the movement.
              </p>
              <Button 
                onClick={handleEmailContact}
                variant="nature" 
                size="lg" 
                className="w-full"
              >
                <Mail className="w-5 h-5 mr-2" />
                Request More Information
              </Button>
            </CardContent>
          </Card>

          {/* Bitcoin Support Card */}
          <Card className="border-primary/20 hover:border-primary/40 transition-colors duration-300">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-nature flex items-center justify-center mx-auto mb-4">
                <Bitcoin className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-4">
                Support with Bitcoin
              </h3>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Help us build the future of sustainable communities. 
                Support HelpLab development with Bitcoin Lightning Network.
              </p>
              <Button 
                onClick={handleBitcoinSupport}
                variant="secondary" 
                size="lg" 
                className="w-full"
              >
                <Bitcoin className="w-5 h-5 mr-2" />
                Support Us with Bitcoin
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Timeline Info */}
        <Card className="border-primary/20 bg-white/50 backdrop-blur-sm">
          <CardContent className="p-8">
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-full bg-gradient-nature flex items-center justify-center mx-auto">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <h4 className="font-semibold text-foreground">Summer 2025</h4>
                <p className="text-sm text-muted-foreground">Local community testing in Italy</p>
              </div>
              
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-full bg-gradient-nature flex items-center justify-center mx-auto">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <h4 className="font-semibold text-foreground">Local Focus</h4>
                <p className="text-sm text-muted-foreground">Empowering Italian communities first</p>
              </div>
              
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-full bg-gradient-nature flex items-center justify-center mx-auto">
                  <Github className="w-6 h-6 text-white" />
                </div>
                <h4 className="font-semibold text-foreground">Open Source</h4>
                <p className="text-sm text-muted-foreground">Frontend released on GitHub</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default SupportSection;