import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ExternalLink, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  user_id: string;
}

interface Profile {
  full_name: string;
  username: string;
  avatar_url: string | null;
}

interface Customization {
  gradient_type: string;
  title_font: string;
  body_font: string;
}

export default function ProductDetail() {
  const { username, productId } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [customization, setCustomization] = useState<Customization | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    loadProductDetail();
  }, [productId, username]);

  const loadProductDetail = async () => {
    if (!productId || !username) return;

    try {
      // Load profile first
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .eq("username", username.toLowerCase())
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Load product
      const { data: productData, error: productError } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .eq("user_id", profileData.id)
        .eq("active", true)
        .single();

      if (productError) throw productError;
      setProduct(productData);

      // Load customization
      const { data: customData } = await supabase
        .from("store_customization")
        .select("gradient_type, title_font, body_font")
        .eq("user_id", profileData.id)
        .single();

      setCustomization(customData);
    } catch (error) {
      console.error("Error loading product:", error);
      toast.error("Produto não encontrado");
      navigate(`/@${username}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBuyNow = () => {
    // TODO: Integração com Checkout NAXE
    toast.info("Integração com Checkout NAXE em breve!");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!product || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="p-8 text-center max-w-md">
          <h1 className="font-space text-2xl font-bold mb-2">Produto não encontrado</h1>
          <Link to={`/@${username}`}>
            <Button className="mt-4">Voltar para a loja</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const gradientClass =
    customization?.gradient_type === "pink-purple"
      ? "bg-gradient-pink-purple"
      : customization?.gradient_type === "blue-cyan"
      ? "bg-gradient-blue-cyan"
      : "bg-gradient-purple-blue";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to={`/@${username}`}>
            <Button variant="ghost" className="gap-2" style={{ fontFamily: customization?.body_font || "Inter" }}>
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </Link>
          
          <div className="flex items-center gap-3">
            {profile.avatar_url ? (
              <div className="h-8 w-8 rounded-full overflow-hidden">
                <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className={`h-8 w-8 rounded-full ${gradientClass} flex items-center justify-center`}>
                <Sparkles className="h-4 w-4 text-white" />
              </div>
            )}
            <span className="font-semibold" style={{ fontFamily: customization?.title_font || "Space Grotesk" }}>
              {profile.full_name}
            </span>
          </div>
        </div>
      </header>

      {/* Product detail */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid gap-8 md:grid-cols-2">
          {/* Images */}
          <div className="space-y-4">
            {product.images && product.images.length > 0 ? (
              <>
                <div className="aspect-square rounded-2xl overflow-hidden border border-border shadow-deep">
                  <img
                    src={product.images[selectedImage]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                {product.images.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {product.images.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImage(index)}
                        className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                          selectedImage === index
                            ? "border-primary shadow-elegant"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <img
                          src={image}
                          alt={`${product.name} ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="aspect-square rounded-2xl border border-border bg-muted flex items-center justify-center">
                <span className="text-muted-foreground" style={{ fontFamily: customization?.body_font || "Inter" }}>
                  Sem imagem
                </span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="space-y-6">
            <div>
              <h1
                className="text-4xl font-bold mb-4"
                style={{ fontFamily: customization?.title_font || "Space Grotesk" }}
              >
                {product.name}
              </h1>
              <div
                className="text-5xl font-bold mb-6"
                style={{ fontFamily: customization?.title_font || "Space Grotesk" }}
              >
                <span className={`bg-gradient-to-r ${gradientClass.replace('bg-', '')} bg-clip-text text-transparent`}>
                  R$ {Number(product.price).toFixed(2)}
                </span>
              </div>
            </div>

            {product.description && (
              <div>
                <h2
                  className="text-lg font-semibold mb-2"
                  style={{ fontFamily: customization?.title_font || "Space Grotesk" }}
                >
                  Descrição
                </h2>
                <p
                  className="text-foreground whitespace-pre-wrap"
                  style={{ fontFamily: customization?.body_font || "Inter" }}
                >
                  {product.description}
                </p>
              </div>
            )}

            <Button
              onClick={handleBuyNow}
              className={`w-full h-16 text-lg ${gradientClass} hover:opacity-90 shadow-elegant`}
              style={{ fontFamily: customization?.title_font || "Space Grotesk" }}
            >
              <ExternalLink className="mr-2 h-5 w-5" />
              Comprar Agora
            </Button>

            <p
              className="text-sm text-muted-foreground text-center"
              style={{ fontFamily: customization?.body_font || "Inter" }}
            >
              Pagamento seguro via Checkout NAXE
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
