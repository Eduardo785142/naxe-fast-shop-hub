import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Package, TrendingUp, ShoppingBag } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalRevenue: 0,
    monthRevenue: 0,
    totalSales: 0,
    avgTicket: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [user]);

  const loadStats = async () => {
    if (!user) return;

    try {
      // Get all sales
      const { data: sales } = await supabase
        .from("sales")
        .select("amount, sale_date")
        .eq("user_id", user.id);

      if (sales) {
        const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.amount), 0);
        
        // Calculate month revenue
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthSales = sales.filter(
          sale => new Date(sale.sale_date) >= firstDayOfMonth
        );
        const monthRevenue = monthSales.reduce((sum, sale) => sum + Number(sale.amount), 0);

        setStats({
          totalRevenue,
          monthRevenue,
          totalSales: sales.length,
          avgTicket: sales.length > 0 ? totalRevenue / sales.length : 0,
        });
      }
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, gradient }: any) => (
    <Card className="border-border bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300 hover:shadow-elegant">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="font-inter text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={`rounded-xl p-2 ${gradient} shadow-glow-primary`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="font-space text-3xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="font-space text-4xl font-bold">Dashboard</h1>
          <p className="mt-2 font-inter text-muted-foreground">
            Bem-vindo de volta! Aqui está um resumo da sua loja.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Faturamento Total"
            value={`R$ ${stats.totalRevenue.toFixed(2)}`}
            icon={DollarSign}
            gradient="bg-gradient-purple-blue"
          />
          <StatCard
            title="Faturamento Mensal"
            value={`R$ ${stats.monthRevenue.toFixed(2)}`}
            icon={TrendingUp}
            gradient="bg-gradient-pink-purple"
          />
          <StatCard
            title="Total de Vendas"
            value={stats.totalSales}
            icon={ShoppingBag}
            gradient="bg-gradient-blue-cyan"
          />
          <StatCard
            title="Ticket Médio"
            value={`R$ ${stats.avgTicket.toFixed(2)}`}
            icon={Package}
            gradient="bg-gradient-purple-blue"
          />
        </div>

        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="font-space">Comece a vender</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="font-inter text-muted-foreground">
                Configure sua loja e comece a vender seus produtos!
              </p>
              <ol className="list-decimal list-inside space-y-2 font-inter text-sm text-muted-foreground">
                <li>Adicione seus produtos na seção "Produtos"</li>
                <li>Personalize o visual da sua loja em "Personalizar"</li>
                <li>Compartilhe o link da sua loja nas redes sociais</li>
                <li>Acompanhe suas vendas aqui no Dashboard</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
