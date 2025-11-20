import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Palette, TrendingUp, ExternalLink, BarChart3, Share2, Zap, Heart, MessageCircle, Users } from "lucide-react";
import naxeLogo from "@/assets/naxe-logo.png";
import heroCreatorFemale from "@/assets/hero-creator-female.svg";
import heroCreatorMale from "@/assets/hero-creator-male.png";
import phoneInstagram from "@/assets/phone-instagram.png";
import phoneTiktok from "@/assets/phone-tiktok.png";
import analyticsCreator from "@/assets/analytics-creator.png";
import creatorsGroup from "@/assets/creators-group.svg";

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-purple-blue opacity-10" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center justify-center lg:justify-start">
                <img src={naxeLogo} alt="Naxe Fast Shop" className="h-24 w-auto" />
              </div>

              <h1 className="font-space text-5xl md:text-7xl font-bold text-center lg:text-left">
                Naxe Fast Shop
              </h1>

              <p className="font-inter text-xl md:text-2xl text-muted-foreground text-center lg:text-left">
                Crie sua mini-loja em minutos. Venda seus produtos com design moderno e personalizado.
                Ideal para influencers e creators.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center">
                <Link to="/auth">
                  <Button className="bg-gradient-purple-blue hover:opacity-90 shadow-elegant font-space text-lg h-14 px-8 gap-2">
                    Começar Agora
                    <ExternalLink className="h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>

            <div className="relative hidden lg:flex justify-center items-center">
              <img src={heroCreatorFemale} alt="Creator feliz" className="w-96 h-auto object-contain filter drop-shadow-[0_20px_60px_rgba(168,85,247,0.4)] hover:scale-105 transition-transform duration-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Use Cases Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="font-space text-4xl font-bold mb-4">
            Tudo que você cria e vende, reunido em um único link
          </h2>
          <p className="font-inter text-xl text-muted-foreground">
            De graça! Crie sua mini-loja em minutos
          </p>
          <div className="flex gap-12 justify-center items-center mt-16">
            <img src={phoneInstagram} alt="Instagram" className="w-64 h-auto object-contain filter drop-shadow-[0_30px_80px_rgba(225,48,108,0.5)] hover:scale-110 transition-transform duration-500" />
            <img src={phoneTiktok} alt="TikTok" className="w-64 h-auto object-contain filter drop-shadow-[0_30px_80px_rgba(37,244,238,0.5)] hover:scale-110 transition-transform duration-500" />
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-6 rounded-xl border border-border bg-card/30 backdrop-blur-sm hover:bg-card/50 transition-all">
            <Share2 className="h-8 w-8 text-primary mb-4" />
            <h3 className="font-space text-xl font-bold mb-2">
              Compartilhe suas redes sociais
            </h3>
            <p className="font-inter text-muted-foreground text-sm">
              Reúna todas as suas redes sociais e divulgue em um único link na bio.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-border bg-card/30 backdrop-blur-sm hover:bg-card/50 transition-all">
            <ShoppingBag className="h-8 w-8 text-primary mb-4" />
            <h3 className="font-space text-xl font-bold mb-2">
              Divulgue seus produtos e serviços
            </h3>
            <p className="font-inter text-muted-foreground text-sm">
              Transforme seus seguidores em clientes levando-os para sua loja.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-border bg-card/30 backdrop-blur-sm hover:bg-card/50 transition-all">
            <TrendingUp className="h-8 w-8 text-primary mb-4" />
            <h3 className="font-space text-xl font-bold mb-2">
              Promova seus links de afiliados
            </h3>
            <p className="font-inter text-muted-foreground text-sm">
              Use o Naxe Fast Shop para aumentar as vendas dos seus produtos afiliados.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-border bg-card/30 backdrop-blur-sm hover:bg-card/50 transition-all">
            <Zap className="h-8 w-8 text-primary mb-4" />
            <h3 className="font-space text-xl font-bold mb-2">
              Divulgue seus conteúdos
            </h3>
            <p className="font-inter text-muted-foreground text-sm">
              Use o link na bio para divulgar vídeos, músicas, podcasts, ebooks e muito mais.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-border bg-card/30 backdrop-blur-sm hover:bg-card/50 transition-all">
            <MessageCircle className="h-8 w-8 text-primary mb-4" />
            <h3 className="font-space text-xl font-bold mb-2">
              Leve mais clientes para o WhatsApp
            </h3>
            <p className="font-inter text-muted-foreground text-sm">
              Aproveite para levar seus seguidores direto para o WhatsApp.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-border bg-card/30 backdrop-blur-sm hover:bg-card/50 transition-all">
            <Heart className="h-8 w-8 text-primary mb-4" />
            <h3 className="font-space text-xl font-bold mb-2">
              Aumente os leads do seu negócio
            </h3>
            <p className="font-inter text-muted-foreground text-sm">
              Capture mais leads divulgando recompensas, eventos e lançamentos.
            </p>
          </div>
        </div>
      </div>

      {/* Analytics Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="relative order-2 lg:order-1">
            <img src={analyticsCreator} alt="Creator analisando métricas" className="w-full h-auto object-contain filter drop-shadow-[0_40px_100px_rgba(168,85,247,0.6)] hover:scale-105 transition-transform duration-700" />
          </div>
          <div className="order-1 lg:order-2">
            <BarChart3 className="h-16 w-16 text-primary mb-6" />
            <h2 className="font-space text-4xl font-bold mb-6">
              Acompanhe as métricas e analise sua audiência
            </h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                <p className="font-inter text-muted-foreground">
                  Saiba qual produto gera maior engajamento
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                <p className="font-inter text-muted-foreground">
                  Monitore o comportamento do seu público e veja o que converte mais
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                <p className="font-inter text-muted-foreground">
                  Acompanhe seu faturamento e vendas em tempo real
                </p>
              </div>
            </div>
            <Link to="/auth">
              <Button className="bg-gradient-purple-blue hover:opacity-90 shadow-elegant font-space text-lg h-12 px-6 mt-8">
                Criar Minha Loja
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-24 relative">
          <div className="p-8 rounded-2xl border border-border bg-card/30 backdrop-blur-sm hover:bg-card/40 transition-all duration-500">
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-xl bg-background/50">
                <span className="font-inter text-sm text-muted-foreground">Vendas hoje</span>
                <span className="font-space text-2xl font-bold">R$ 1.247</span>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-background/50">
                <span className="font-inter text-sm text-muted-foreground">Ticket médio</span>
                <span className="font-space text-2xl font-bold">R$ 89</span>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-background/50">
                <span className="font-inter text-sm text-muted-foreground">Conversão</span>
                <span className="font-space text-2xl font-bold">12.5%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How it Works Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="font-space text-4xl font-bold mb-4">
            Como criar sua loja usando o Naxe Fast Shop
          </h2>
          <p className="font-inter text-xl text-muted-foreground">
            Em apenas 4 passos simples
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-purple-blue shadow-glow-primary mb-6 mx-auto">
              <span className="font-space text-2xl font-bold text-white">1</span>
            </div>
            <h3 className="font-space text-xl font-bold mb-3">
              Crie sua conta
            </h3>
            <p className="font-inter text-muted-foreground">
              Cadastre-se e escolha um nome de usuário para sua loja.
            </p>
          </div>

          <div className="text-center">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-pink-purple shadow-glow-primary mb-6 mx-auto">
              <span className="font-space text-2xl font-bold text-white">2</span>
            </div>
            <h3 className="font-space text-xl font-bold mb-3">
              Adicione seus produtos
            </h3>
            <p className="font-inter text-muted-foreground">
              Cadastre os produtos que você quer vender com fotos e preços.
            </p>
          </div>

          <div className="text-center">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-blue-cyan shadow-glow-primary mb-6 mx-auto">
              <span className="font-space text-2xl font-bold text-white">3</span>
            </div>
            <h3 className="font-space text-xl font-bold mb-3">
              Personalize sua loja
            </h3>
            <p className="font-inter text-muted-foreground">
              Escolha cores, fontes e deixe a loja com a sua cara!
            </p>
          </div>

          <div className="text-center">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-purple-blue shadow-glow-primary mb-6 mx-auto">
              <span className="font-space text-2xl font-bold text-white">4</span>
            </div>
            <h3 className="font-space text-xl font-bold mb-3">
              Compartilhe
            </h3>
            <p className="font-inter text-muted-foreground">
              Divulgue sua loja na bio e acompanhe suas vendas no painel.
            </p>
          </div>
        </div>
      </div>

      {/* Social Proof Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-12">
          <Users className="h-12 w-12 text-primary mx-auto mb-4" />
          <h2 className="font-space text-3xl font-bold mb-4">
            Junte-se a milhares de creators
          </h2>
          <p className="font-inter text-xl text-muted-foreground mb-16">
            Influencers e empreendedores já estão vendendo com o Naxe Fast Shop
          </p>
          <div className="relative">
            <img src={creatorsGroup} alt="Grupo de creators felizes" className="w-full max-w-5xl mx-auto h-auto object-contain filter drop-shadow-[0_40px_120px_rgba(37,244,238,0.5)] hover:scale-105 transition-transform duration-700" />
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="relative rounded-3xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-purple-blue" />
          <div className="relative px-8 py-16 text-center">
            <h2 className="font-space text-4xl font-bold text-white mb-4">
              Pronto para começar?
            </h2>
            <p className="font-inter text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              Crie sua loja agora e comece a vender em minutos
            </p>
            <Link to="/auth">
              <Button className="bg-white text-primary hover:bg-white/90 shadow-elegant font-space text-lg h-14 px-8">
                Criar Minha Loja
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center font-inter text-muted-foreground">
            © 2024 Naxe Fast Shop. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
