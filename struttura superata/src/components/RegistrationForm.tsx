import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Users, Leaf, Heart, Globe } from 'lucide-react';

interface FormData {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
}

const RegistrationForm = () => {
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    username: '',
    email: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Validazione semplice
    if (!formData.firstName || !formData.lastName || !formData.username || !formData.email) {
      toast({
        title: "Campi mancanti",
        description: "Per favore, compila tutti i campi richiesti.",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    // Simulazione dell'invio del form
    setTimeout(() => {
      toast({
        title: "Benvenuto nella community! 🌱",
        description: "La tua registrazione è stata completata con successo. Insieme possiamo fare la differenza!",
      });
      setIsLoading(false);
      setFormData({
        firstName: '',
        lastName: '',
        username: '',
        email: ''
      });
    }, 2000);
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-xl border-primary/20">
      <CardHeader className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-gradient-nature flex items-center justify-center mb-2">
          <Leaf className="w-8 h-8 text-white" />
        </div>
        <CardTitle className="text-2xl font-bold text-foreground">
          Unisciti alla Community
        </CardTitle>
        <CardDescription className="text-muted-foreground leading-relaxed">
          Diventa parte di un movimento globale per la sostenibilità. 
          Insieme possiamo creare un futuro più verde per il nostro pianeta.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Community benefits */}
        <div className="grid grid-cols-2 gap-3 p-4 bg-gradient-sky rounded-lg">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Community</span>
          </div>
          <div className="flex items-center space-x-2">
            <Globe className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Impatto globale</span>
          </div>
          <div className="flex items-center space-x-2">
            <Leaf className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Azioni sostenibili</span>
          </div>
          <div className="flex items-center space-x-2">
            <Heart className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Futuro migliore</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Nome</Label>
              <Input
                id="firstName"
                name="firstName"
                type="text"
                placeholder="Il tuo nome"
                value={formData.firstName}
                onChange={handleInputChange}
                required
                className="border-primary/20 focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Cognome</Label>
              <Input
                id="lastName"
                name="lastName"
                type="text"
                placeholder="Il tuo cognome"
                value={formData.lastName}
                onChange={handleInputChange}
                required
                className="border-primary/20 focus:border-primary"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Nome utente</Label>
            <Input
              id="username"
              name="username"
              type="text"
              placeholder="Scegli un nome utente unico"
              value={formData.username}
              onChange={handleInputChange}
              required
              className="border-primary/20 focus:border-primary"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="la-tua-email@esempio.com"
              value={formData.email}
              onChange={handleInputChange}
              required
              className="border-primary/20 focus:border-primary"
            />
          </div>

          <Button 
            type="submit" 
            variant="nature" 
            className="w-full" 
            size="lg"
            disabled={isLoading}
          >
            {isLoading ? "Registrazione in corso..." : "Unisciti alla Community"}
          </Button>
        </form>

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Registrandoti accetti di far parte di una community dedicata alla sostenibilità 
            e all'azione per il pianeta.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default RegistrationForm;