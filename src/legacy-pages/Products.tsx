import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Plus, Edit, Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  active: boolean;
}

export default function Products() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, [user]);

  const loadProducts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error loading products:", error);
      toast.error("Erro ao carregar produtos");
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (productId: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from("products")
        .update({ active: !currentActive })
        .eq("id", productId);

      if (error) throw error;
      toast.success(currentActive ? "Produto desativado" : "Produto ativado");
      loadProducts();
    } catch (error) {
      toast.error("Erro ao atualizar produto");
    }
  };

  const deleteProduct = async (productId: string) => {
    if (!confirm("Tem certeza que deseja deletar este produto?")) return;

    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", productId);

      if (error) throw error;
      toast.success("Produto deletado com sucesso");
      loadProducts();
    } catch (error) {
      toast.error("Erro ao deletar produto");
    }
  };

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-space text-4xl font-bold">Produtos</h1>
            <p className="mt-2 font-inter text-muted-foreground">
              Gerencie seus produtos
            </p>
          </div>
          <Link to="/products/new">
            <Button className="bg-gradient-purple-blue hover:opacity-90 shadow-elegant font-space gap-2">
              <Plus className="h-5 w-5" />
              Novo Produto
            </Button>
          </Link>
        </div>

        {products.length === 0 ? (
          <Card className="border-border bg-card/50 backdrop-blur-sm">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Plus className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-space text-xl font-semibold mb-2">
                Nenhum produto ainda
              </h3>
              <p className="font-inter text-muted-foreground text-center mb-4">
                Comece adicionando seu primeiro produto
              </p>
              <Link to="/products/new">
                <Button className="bg-gradient-purple-blue hover:opacity-90 shadow-elegant font-space gap-2">
                  <Plus className="h-5 w-5" />
                  Adicionar Produto
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <Card
                key={product.id}
                className="border-border bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300 overflow-hidden group"
              >
                <CardHeader className="p-0">
                  {product.images && product.images.length > 0 ? (
                    <div className="aspect-square relative overflow-hidden bg-muted">
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                      />
                      {!product.active && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <span className="font-inter text-white font-semibold">
                            Inativo
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="aspect-square bg-muted flex items-center justify-center">
                      <span className="font-inter text-muted-foreground">
                        Sem imagem
                      </span>
                    </div>
                  )}
                </CardHeader>

                <CardContent className="p-4">
                  <h3 className="font-space text-lg font-semibold mb-1">
                    {product.name}
                  </h3>
                  <p className="font-space text-2xl font-bold text-primary">
                    R$ {Number(product.price).toFixed(2)}
                  </p>
                  {product.description && (
                    <p className="font-inter text-sm text-muted-foreground mt-2 line-clamp-2">
                      {product.description}
                    </p>
                  )}
                </CardContent>

                <CardFooter className="p-4 pt-0 flex gap-2">
                  <Link to={`/products/${product.id}/edit`} className="flex-1">
                    <Button
                      variant="outline"
                      className="w-full gap-2 font-inter"
                      size="sm"
                    >
                      <Edit className="h-4 w-4" />
                      Editar
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleActive(product.id, product.active)}
                    className="gap-2 font-inter"
                  >
                    {product.active ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteProduct(product.id)}
                    className="gap-2 font-inter text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
