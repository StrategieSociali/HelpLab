import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Users, 
  Lightbulb, 
  Target, 
  Award, 
  MessageCircle, 
  TrendingUp,
  Leaf,
  Heart
} from 'lucide-react';
import communityEarth from '@/assets/community-earth.jpg';

const benefits = [
  {
    icon: Users,
    title: "Community Globale",
    description: "Connettiti con persone che condividono la tua passione per l'ambiente"
  },
  {
    icon: Lightbulb,
    title: "Idee Innovative",
    description: "Scopri nuove soluzioni sostenibili condivise dalla community"
  },
  {
    icon: Target,
    title: "Obiettivi Concreti",
    description: "Partecipa a sfide e progetti con impatto misurabile"
  },
  {
    icon: Award,
    title: "Riconoscimenti",
    description: "Ottieni badge e certificazioni per le tue azioni sostenibili"
  },
  {
    icon: MessageCircle,
    title: "Supporto Continuo",
    description: "Ricevi aiuto e consigli dalla community in ogni momento"
  },
  {
    icon: TrendingUp,
    title: "Crescita Personale",
    description: "Sviluppa competenze e conoscenze sulla sostenibilità"
  }
];

const CommunityBenefits = () => {
  return (
    <section className="py-20 px-6 bg-gradient-sky">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-nature flex items-center justify-center">
              <Heart className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Perché Unirsi alla Community?
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Quando ti unisci a noi, non stai solo registrandoti a una piattaforma. 
            Stai entrando in un movimento globale di persone che credono nel cambiamento.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Benefits grid */}
          <div className="grid gap-6">
            {benefits.map((benefit, index) => (
              <Card key={index} className="border-primary/20 hover:border-primary/40 transition-colors duration-300">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-nature flex items-center justify-center flex-shrink-0">
                      <benefit.icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        {benefit.title}
                      </h3>
                      <p className="text-muted-foreground">
                        {benefit.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Community image */}
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              <img 
                src={communityEarth} 
                alt="Community globale per la sostenibilità"
                className="w-full h-auto object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/30 to-transparent"></div>
            </div>
            
            {/* Floating stats */}
            <div className="absolute -bottom-6 -left-6 bg-white rounded-xl p-4 shadow-lg border border-primary/20">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-gradient-nature flex items-center justify-center">
                  <Leaf className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">2.5M</div>
                  <div className="text-sm text-muted-foreground">Tonnellate CO₂ risparmiate</div>
                </div>
              </div>
            </div>

            <div className="absolute -top-6 -right-6 bg-white rounded-xl p-4 shadow-lg border border-primary/20">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-gradient-nature flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">50K+</div>
                  <div className="text-sm text-muted-foreground">Membri attivi</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CommunityBenefits;