import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Target, 
  BookOpen, 
  ShoppingCart, 
  MessageCircle, 
  Bitcoin,
  Zap
} from 'lucide-react';

const features = [
  {
    icon: Target,
    title: "Sustainability Challenges",
    description: "Join and complete sustainable challenges to earn rewards."
  },
  {
    icon: BookOpen,
    title: "Learning Paths",
    description: "Access educational modules to improve your knowledge."
  },
  {
    icon: ShoppingCart,
    title: "Local Circular Economy",
    description: "Buy, sell, or exchange sustainable products."
  },
  {
    icon: MessageCircle,
    title: "Social Space",
    description: "Connect, share experiences, and chat privately with others."
  },
  {
    icon: Bitcoin,
    title: "Bitcoin Wallet Support",
    description: "Use Bitcoin Lightning Network for transactions."
  }
];

const FeaturesTable = () => {
  return (
    <section className="py-20 px-6 bg-background">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-nature flex items-center justify-center">
              <Zap className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Main Features
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Scopri tutte le funzionalità che rendono HelpLab la piattaforma ideale 
            per il cambiamento sostenibile e l'empowerment delle comunità locali.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="border-primary/20 hover:border-primary/40 transition-all duration-300 hover:shadow-lg">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-nature flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesTable;