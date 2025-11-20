import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";

const productSchema = z.object({
  name: z.string().min(3, { message: "Nome deve ter no mínimo 3 caracteres" }).max(100),
  description: z.string().max(1000, { message: "Descrição deve ter no máximo 1000 caracteres" }).optional(),
  price: z.number().positive({ message: "Preço deve ser maior que zero" }),
});

export default function ProductForm() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const isEditing = !!id;

  useEffect(() => {
    if (isEditing) {
      loadProduct();
    }
  }, [id]);

  const loadProduct = async () => {
    if (!id || !user) return;

    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (error) throw error;

      if (data) {
        setName(data.name);
        setDescription(data.description || "");
        setPrice(data.price.toString());
        if (data.images && data.images.length > 0) {
          setImageUrl(data.images[0]);
        }
      }
    } catch (error) {
      console.error("Error loading product:", error);
      toast.error("Erro ao carregar produto");
      navigate("/products");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      const productData = {
        name: name.trim(),
        description: description.trim(),
        price: parseFloat(price),
      };

      const validation = productSchema.safeParse(productData);
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        setLoading(false);
        return;
      }

      const images = imageUrl.trim() ? [imageUrl.trim()] : [];

      if (isEditing) {
        const { error } = await supabase
          .from("products")
          .update({ ...productData, images })
          .eq("id", id)
          .eq("user_id", user.id);

        if (error) throw error;
        toast.success("Produto atualizado com sucesso!");
      } else {
        const { error } = await supabase
          .from("products")
          .insert([{ ...productData, images, user_id: user.id }]);

        if (error) throw error;
        toast.success("Produto criado com sucesso!");
      }

      navigate("/products");
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar produto");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <Button
            variant="ghost"
            onClick={() => navigate("/products")}
            className="mb-4 gap-2 font-inter"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <h1 className="font-space text-4xl font-bold">
            {isEditing ? "Editar Produto" : "Novo Produto"}
          </h1>
          <p className="mt-2 font-inter text-muted-foreground">
            {isEditing ? "Atualize as informações do produto" : "Adicione um novo produto à sua loja"}
          </p>
        </div>

        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="font-space">Informações do Produto</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="font-inter">Nome do produto *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Camiseta Premium"
                  required
                  className="bg-background/50 border-border focus:border-primary transition-colors"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price" className="font-inter">Preço (R$) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="99.90"
                  required
                  className="bg-background/50 border-border focus:border-primary transition-colors"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="font-inter">Descrição</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva seu produto..."
                  rows={4}
                  className="bg-background/50 border-border focus:border-primary transition-colors resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="imageUrl" className="font-inter">URL da Imagem</Label>
                <Input
                  id="imageUrl"
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://exemplo.com/imagem.jpg"
                  className="bg-background/50 border-border focus:border-primary transition-colors"
                />
                {imageUrl && (
                  <div className="mt-4 rounded-xl overflow-hidden border border-border">
                    <img
                      src={imageUrl}
                      alt="Preview"
                      className="w-full h-64 object-cover"
                      onError={(e) => {
                        e.currentTarget.src = "";
                        toast.error("Erro ao carregar imagem");
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/products")}
                  className="flex-1 font-inter"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-purple-blue hover:opacity-90 shadow-elegant font-space"
                >
                  {loading ? "Salvando..." : isEditing ? "Atualizar" : "Criar Produto"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
