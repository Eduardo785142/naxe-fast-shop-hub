import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, ShoppingBag, Palette, TrendingUp, ExternalLink } from "lucide-react";

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-purple-blue opacity-10" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center space-y-8">
            <div className="inline-flex items-center justify-center h-20 w-20 rounded-3xl bg-gradient-purple-blue shadow-glow-primary mx-auto">
              <Sparkles className="h-10 w-10 text-white" />
            </div>

            <h1 className="font-space text-5xl md:text-7xl font-bold">
              Naxe Fast Shop
            </h1>

            <p className="font-inter text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
              Crie sua mini-loja em minutos. Venda seus produtos com design moderno e personalizado.
              Ideal para influencers e creators.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/auth">
                <Button className="bg-gradient-purple-blue hover:opacity-90 shadow-elegant font-space text-lg h-14 px-8 gap-2">
                  Começar Agora
                  <ExternalLink className="h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="font-space text-4xl font-bold mb-4">
            Tudo que você precisa para vender online
          </h2>
          <p className="font-inter text-xl text-muted-foreground">
            Uma plataforma completa para creators
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="group p-8 rounded-2xl border border-border bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300 hover:shadow-elegant">
            <div className="h-14 w-14 rounded-xl bg-gradient-purple-blue flex items-center justify-center mb-6 shadow-glow-primary group-hover:scale-110 transition-transform">
              <ShoppingBag className="h-7 w-7 text-white" />
            </div>
            <h3 className="font-space text-2xl font-bold mb-3">
              Gestão de Produtos
            </h3>
            <p className="font-inter text-muted-foreground">
              Adicione, edite e gerencie seus produtos facilmente. Controle estoque e preços em tempo real.
            </p>
          </div>

          <div className="group p-8 rounded-2xl border border-border bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300 hover:shadow-elegant">
            <div className="h-14 w-14 rounded-xl bg-gradient-pink-purple flex items-center justify-center mb-6 shadow-glow-primary group-hover:scale-110 transition-transform">
              <Palette className="h-7 w-7 text-white" />
            </div>
            <h3 className="font-space text-2xl font-bold mb-3">
              Personalização Total
            </h3>
            <p className="font-inter text-muted-foreground">
              Customize cores, fontes e layout. Crie uma loja única que reflita sua marca pessoal.
            </p>
          </div>

          <div className="group p-8 rounded-2xl border border-border bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300 hover:shadow-elegant">
            <div className="h-14 w-14 rounded-xl bg-gradient-blue-cyan flex items-center justify-center mb-6 shadow-glow-primary group-hover:scale-110 transition-transform">
              <TrendingUp className="h-7 w-7 text-white" />
            </div>
            <h3 className="font-space text-2xl font-bold mb-3">
              Analytics & Vendas
            </h3>
            <p className="font-inter text-muted-foreground">
              Acompanhe suas vendas, faturamento e produtos mais vendidos em um dashboard intuitivo.
            </p>
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
